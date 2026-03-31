import socket
import threading
import select
import struct
import logging
import ssl
import time
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Optimized constants
BUFFER_SIZE = 65536  # 64KB - much larger buffer
SELECT_TIMEOUT = 5.0  # Longer timeout to reduce CPU usage
SOCKET_TIMEOUT = 30.0  # Longer socket timeout
MAX_WORKERS = 50  # Thread pool size

class OptimizedProxy:
    def __init__(self, host='0.0.0.0', http_port=6321, socks_port=6464):
        self.host = host
        self.http_port = http_port
        self.socks_port = socks_port
        self.executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
        
    def optimized_relay(self, sock1, sock2, timeout=300):
        """Highly optimized bidirectional relay"""
        try:
            # Set larger receive buffers
            sock1.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 262144)  # 256KB
            sock2.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 262144)
            sock1.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 262144)  # 256KB
            sock2.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 262144)
            
            # Disable Nagle's algorithm for lower latency
            sock1.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            sock2.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            
            last_activity = time.time()
            sockets = [sock1, sock2]
            
            while time.time() - last_activity < timeout:
                try:
                    ready, _, error = select.select(sockets, [], sockets, SELECT_TIMEOUT)
                    
                    if error:
                        break
                        
                    if not ready:
                        continue
                        
                    for sock in ready:
                        try:
                            data = sock.recv(BUFFER_SIZE)
                            if not data:
                                return
                                
                            # Send to the other socket
                            other_sock = sock2 if sock == sock1 else sock1
                            other_sock.sendall(data)
                            last_activity = time.time()
                            
                        except socket.error:
                            return
                            
                except select.error:
                    break
                    
        except Exception as e:
            logging.debug(f"Relay error: {e}")
        finally:
            try:
                sock1.close()
                sock2.close()
            except:
                pass

    def http_handler(self, client, addr):
        """Optimized HTTP/HTTPS handler"""
        try:
            client.settimeout(SOCKET_TIMEOUT)
            
            # Read request with larger buffer
            request_data = b""
            start_time = time.time()
            
            while b"\r\n\r\n" not in request_data and time.time() - start_time < 10:
                try:
                    chunk = client.recv(16384)  # Larger chunk size
                    if not chunk:
                        return
                    request_data += chunk
                    if len(request_data) > 65536:  # Larger limit
                        return
                except socket.timeout:
                    continue
            
            if b"\r\n\r\n" not in request_data:
                return
                
            # Parse request
            try:
                request_str = request_data.decode('utf-8', errors='ignore')
            except:
                return
                
            lines = request_str.split('\r\n')
            if not lines:
                return
                
            first_line = lines[0].strip()
            if not first_line:
                return
                
            parts = first_line.split(' ')
            if len(parts) < 3:
                return
                
            method, url, version = parts[0], parts[1], parts[2]
            
            # Parse headers
            headers = {}
            for line in lines[1:]:
                if ':' in line:
                    key, value = line.split(':', 1)
                    headers[key.strip().lower()] = value.strip()
            
            # Handle CONNECT method (HTTPS)
            if method.upper() == 'CONNECT':
                if ':' not in url:
                    client.send(b"HTTP/1.1 400 Bad Request\r\n\r\n")
                    return
                    
                try:
                    host, port = url.rsplit(':', 1)
                    port = int(port)
                except ValueError:
                    client.send(b"HTTP/1.1 400 Bad Request\r\n\r\n")
                    return
                
                logging.info(f"HTTPS {host}:{port} from {addr[0]}")
                
                try:
                    # Create optimized connection
                    remote = socket.create_connection((host, port), timeout=10)
                    
                    # Optimize remote socket
                    remote.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                    remote.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
                    
                    client.send(b"HTTP/1.1 200 Connection established\r\n\r\n")
                    
                    # Use optimized relay
                    self.optimized_relay(client, remote)
                    return
                    
                except Exception as e:
                    logging.error(f"CONNECT failed {host}:{port}: {e}")
                    try:
                        client.send(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
                    except:
                        pass
                    return
            
            # Handle regular HTTP
            if url.startswith('http://') or url.startswith('https://'):
                import urllib.parse
                parsed = urllib.parse.urlparse(url)
                host = parsed.hostname
                port = parsed.port or (443 if parsed.scheme == 'https' else 80)
                path = parsed.path or '/'
                if parsed.query:
                    path += '?' + parsed.query
                use_ssl = parsed.scheme == 'https'
            else:
                host_header = headers.get('host', '')
                if not host_header:
                    client.send(b"HTTP/1.1 400 Bad Request\r\n\r\n")
                    return
                    
                if ':' in host_header:
                    host, port_str = host_header.rsplit(':', 1)
                    try:
                        port = int(port_str)
                    except ValueError:
                        port = 80
                else:
                    host = host_header
                    port = 80
                path = url
                use_ssl = False
            
            logging.info(f"HTTP {method} {host}:{port} from {addr[0]}")
            
            try:
                # Create optimized connection
                remote = socket.create_connection((host, port), timeout=10)
                remote.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                
                if use_ssl:
                    context = ssl.create_default_context()
                    context.check_hostname = False
                    context.verify_mode = ssl.CERT_NONE
                    remote = context.wrap_socket(remote, server_hostname=host)
                
                # Build and send request
                new_request = f"{method} {path} {version}\r\n"
                for key, value in headers.items():
                    if not key.startswith('proxy-'):
                        new_request += f"{key.title()}: {value}\r\n"
                
                if 'host' not in headers:
                    new_request += f"Host: {host}\r\n"
                    
                new_request += "\r\n"
                remote.send(new_request.encode('utf-8'))
                
                # Send body if present
                body_start = request_data.find(b"\r\n\r\n") + 4
                if body_start < len(request_data):
                    remote.send(request_data[body_start:])
                
                # Use optimized relay for all connections
                self.optimized_relay(client, remote)
                    
            except Exception as e:
                logging.error(f"HTTP connection failed {host}:{port}: {e}")
                try:
                    client.send(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
                except:
                    pass
                    
        except Exception as e:
            logging.error(f'HTTP handler error: {e}')
        finally:
            try:
                client.close()
            except:
                pass

    def socks5_handler(self, client, addr):
        """Optimized SOCKS5 handler"""
        try:
            client.settimeout(SOCKET_TIMEOUT)
            
            # SOCKS5 greeting
            try:
                greeting = client.recv(2)
                if len(greeting) != 2:
                    return
                ver, nmethods = struct.unpack("!BB", greeting)
            except:
                return
                
            if ver != 5:
                return
            
            try:
                methods = client.recv(nmethods)
                if len(methods) != nmethods:
                    return
            except:
                return
                
            client.send(b'\x05\x00')
            
            # Read request
            try:
                request = client.recv(4)
                if len(request) != 4:
                    return
                ver, cmd, _, atyp = struct.unpack("!BBBB", request)
            except:
                return
            
            if ver != 5 or cmd != 1:
                client.send(b'\x05\x07\x00\x01\x00\x00\x00\x00\x00\x00')
                return
            
            # Parse destination
            try:
                if atyp == 1:  # IPv4
                    addr_data = client.recv(4)
                    if len(addr_data) != 4:
                        return
                    host = socket.inet_ntoa(addr_data)
                elif atyp == 3:  # Domain
                    addr_len_data = client.recv(1)
                    if len(addr_len_data) != 1:
                        return
                    addr_len = struct.unpack("!B", addr_len_data)[0]
                    addr_data = client.recv(addr_len)
                    if len(addr_data) != addr_len:
                        return
                    host = addr_data.decode('utf-8', errors='ignore')
                else:
                    client.send(b'\x05\x08\x00\x01\x00\x00\x00\x00\x00\x00')
                    return
                
                port_data = client.recv(2)
                if len(port_data) != 2:
                    return
                port = struct.unpack("!H", port_data)[0]
                
            except Exception as e:
                logging.error(f"SOCKS5 parsing error: {e}")
                return
            
            logging.info(f"SOCKS5 {host}:{port} from {addr[0]}")
            
            try:
                # Create optimized connection
                remote = socket.create_connection((host, port), timeout=10)
                remote.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                remote.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
                
                # Send success response
                bind_addr = remote.getsockname()
                response = b'\x05\x00\x00\x01'
                response += socket.inet_aton(bind_addr[0])
                response += struct.pack("!H", bind_addr[1])
                client.send(response)
                
                # Use optimized relay
                self.optimized_relay(client, remote)
                
            except Exception as e:
                logging.error(f"SOCKS5 connect failed {host}:{port}: {e}")
                try:
                    client.send(b'\x05\x01\x00\x01\x00\x00\x00\x00\x00\x00')
                except:
                    pass
                    
        except Exception as e:
            logging.error(f"SOCKS5 handler error: {e}")
        finally:
            try:
                client.close()
            except:
                pass

    def start_server(self, port, handler, name):
        """Optimized server with better resource management"""
        try:
            server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            
            # Optimize server socket
            server.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 262144)
            server.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 262144)
            
            server.bind((self.host, port))
            server.listen(200)  # Larger backlog
            server.settimeout(1.0)
            
            logging.info(f"{name} server started on {self.host}:{port}")
            
            while True:
                try:
                    client, client_addr = server.accept()
                    
                    # Optimize client socket immediately
                    client.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                    client.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
                    
                    # Use thread pool instead of creating new threads
                    self.executor.submit(handler, client, client_addr)
                    
                except socket.timeout:
                    continue
                except Exception as e:
                    logging.error(f"{name} accept error: {e}")
                    time.sleep(0.1)
                    
        except Exception as e:
            logging.error(f"{name} server error: {e}")

    def start(self):
        """Start optimized proxy servers"""
        logging.info(f"Optimized Proxy Server v3.0")
        logging.info(f"HTTP/HTTPS: {self.host}:{self.http_port}")
        logging.info(f"SOCKS5: {self.host}:{self.socks_port}")
        logging.info(f"Buffer size: {BUFFER_SIZE} bytes")
        logging.info(f"Max workers: {MAX_WORKERS}")
        
        # Start servers in separate threads
        http_thread = threading.Thread(
            target=self.start_server, 
            args=(self.http_port, self.http_handler, "HTTP"),
            daemon=True
        )
        socks_thread = threading.Thread(
            target=self.start_server, 
            args=(self.socks_port, self.socks5_handler, "SOCKS5"),
            daemon=True
        )
        
        http_thread.start()
        socks_thread.start()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logging.info("Shutting down...")
            self.executor.shutdown(wait=True)

if __name__ == '__main__':
    proxy = OptimizedProxy()
    proxy.start()
