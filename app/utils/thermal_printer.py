import socket
from datetime import datetime

class ThermalPrinter:
    """
    ESC/POS thermal printer controller for Fun Print integration.
    Communicates directly via TCP socket to thermal printer service.
    """
    
    def __init__(self, host='localhost', port=9100):
        """
        Initialize thermal printer connection.
        
        Args:
            host: IP address or hostname of thermal printer service (default: localhost)
            port: Port number for thermal printer service (default: 9100 - standard ESC/POS port)
        """
        self.host = host
        self.port = port
        self.timeout = 5
    
    def _send_command(self, data):
        """
        Send raw ESC/POS command to thermal printer.
        
        Args:
            data: Bytes to send to printer
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            sock.connect((self.host, self.port))
            sock.sendall(data)
            sock.close()
            return True
        except (socket.timeout, socket.error, ConnectionRefusedError) as e:
            print(f"Printer connection error: {e}")
            return False
    
    def _encode_text(self, text, encoding='utf-8'):
        """Encode text to bytes."""
        return text.encode(encoding, errors='replace')
    
    def initialize(self):
        """Initialize printer (reset to default settings)."""
        return self._send_command(b'\x1b\x40')
    
    def set_alignment(self, alignment='center'):
        """
        Set text alignment.
        
        Args:
            alignment: 'left' (0), 'center' (1), or 'right' (2)
        """
        align_map = {'left': 0, 'center': 1, 'right': 2}
        align_code = align_map.get(alignment, 1)
        return self._send_command(f'\x1b\x61{chr(align_code)}'.encode())
    
    def set_font_size(self, width=1, height=1):
        """
        Set font size (width and height multiplier).
        
        Args:
            width: 1-8 (1 = normal)
            height: 1-8 (1 = normal)
        """
        width = max(1, min(8, width))
        height = max(1, min(8, height))
        size_byte = chr((width - 1) + ((height - 1) << 4))
        return self._send_command(f'\x1d\x21{size_byte}'.encode())
    
    def set_bold(self, enabled=True):
        """Enable or disable bold text."""
        command = b'\x1b\x45\x01' if enabled else b'\x1b\x45\x00'
        return self._send_command(command)
    
    def print_text(self, text):
        """Print text."""
        return self._send_command(self._encode_text(text))
    
    def print_line(self, text=''):
        """Print text followed by newline."""
        return self._send_command(self._encode_text(text + '\n'))
    
    def print_separator(self, char='-', width=40):
        """Print a separator line."""
        return self.print_line(char * width)
    
    def linefeed(self, lines=1):
        """Print blank lines."""
        return self._send_command(b'\n' * lines)
    
    def cut_paper(self):
        """Cut paper (full cut)."""
        return self._send_command(b'\x1d\x56\x00')
    
    def print_receipt(self, receipt_data):
        """
        Print a complete receipt with transaction details.
        
        Args:
            receipt_data: Dictionary containing:
                - code: Transaction code
                - therapist_name: Name of therapist
                - room_number: Room number
                - services: List of service dicts with 'name', 'duration_minutes', 'price'
                - total_amount: Total transaction amount
                - amount_paid: Amount paid
                - change_amount: Change amount
                - payment_method: Payment method
                - payment_date: Payment date/time
        """
        try:
            self.initialize()
            self.set_alignment('center')
            self.set_font_size(2, 2)
            self.set_bold(True)
            self.print_line('SPA RECEIPT')
            self.set_font_size(1, 1)
            self.set_bold(False)
            self.print_line()
            
            self.set_alignment('left')
            self.print_separator()
            self.print_line(f"Transaction: {receipt_data.get('code', 'N/A')}")
            self.print_line(f"Therapist: {receipt_data.get('therapist_name', 'N/A')}")
            self.print_line(f"Room: {receipt_data.get('room_number', 'N/A')}")
            self.print_line()
            
            self.print_separator()
            self.print_line('SERVICES')
            self.print_separator()
            
            services = receipt_data.get('services', [])
            for service in services:
                service_name = service.get('name', 'Unknown')
                duration = service.get('duration_minutes', 0)
                price = service.get('price', 0)
                self.print_line(f"{service_name}")
                self.print_line(f"  {duration}min - ₱{price:.2f}")
            
            self.print_line()
            self.print_separator()
            
            self.set_alignment('right')
            self.set_font_size(1, 2)
            self.set_bold(True)
            total = receipt_data.get('total_amount', 0)
            self.print_line(f"Total: ₱{total:.2f}")
            self.set_font_size(1, 1)
            self.set_bold(False)
            
            self.set_alignment('left')
            amount_paid = receipt_data.get('amount_paid', 0)
            change = receipt_data.get('change_amount', 0)
            method = receipt_data.get('payment_method', 'N/A')
            date_str = receipt_data.get('payment_date', '')
            
            self.print_line(f"Amount Paid: ₱{amount_paid:.2f}")
            self.print_line(f"Change: ₱{change:.2f}")
            self.print_line(f"Method: {method}")
            self.print_line(f"Date: {date_str}")
            
            self.print_line()
            self.set_alignment('center')
            self.print_line('Thank you!')
            self.print_line()
            
            self.linefeed(2)
            self.cut_paper()
            
            return True
        except Exception as e:
            print(f"Error printing receipt: {e}")
            return False
