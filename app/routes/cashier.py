from flask import Blueprint, render_template, session, redirect, url_for, jsonify, request
from ..models import Cashier, Payment, Transaction, TransactionItem, ServiceClassification, Service
from ..utils.auth_helpers import get_current_cashier
from ..utils.thermal_printer import ThermalPrinter
from .. import db

cashier_bp = Blueprint("cashier", __name__)

@cashier_bp.get("/cashier")
def cashier_page():
    # Use hybrid authentication (token-first, session fallback)
    cashier, auth_method = get_current_cashier()
    
    if not cashier:
        return redirect(url_for("auth.login_cashier_form"))
    
    return render_template("cashier.html", 
                         cashier_name=cashier.name, 
                         counter_number=cashier.counter_number,
                         token=cashier.auth_token)


@cashier_bp.get("/cashier/payment-management")
def payment_management_page():
    # Use hybrid authentication (token-first, session fallback)
    cashier, auth_method = get_current_cashier()
    
    if not cashier:
        return redirect(url_for("auth.login_cashier_form"))
    
    return render_template("payment_management.html", 
                         cashier_name=cashier.name, 
                         counter_number=cashier.counter_number)


@cashier_bp.get("/cashier/payment-history")
def get_payment_history():
    """Get all paid transactions processed by the current cashier"""
    cashier, auth_method = get_current_cashier()
    
    if not cashier:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Query payments made by this cashier
    payments = Payment.query.filter_by(cashier_id=cashier.id).order_by(Payment.created_at.desc()).limit(50).all()
    
    # Format the payment data with transaction details
    payment_history = []
    for payment in payments:
        transaction = payment.transaction
        if not transaction:
            continue
            
        # Get all services for this transaction
        services = []
        for item in transaction.items:
            service_classification = ServiceClassification.query.get(item.service_classification_id)
            service = Service.query.get(item.service_id)
            
            if service and service_classification:
                services.append({
                    'service_name': service.service_name,
                    'classification_name': service_classification.classification_name,
                    'duration_minutes': item.duration_minutes,
                    'price': item.price
                })
        
        payment_history.append({
            'payment_id': payment.id,
            'transaction_id': transaction.id,
            'code': transaction.code,
            'amount_due': payment.amount_due,
            'amount_paid': payment.amount_paid,
            'change_amount': payment.change_amount,
            'payment_method': payment.method,
            'payment_date': payment.created_at.strftime('%Y-%m-%d %H:%M:%S') if payment.created_at else None,
            'services': services,
            'therapist_name': transaction.therapist.name if transaction.therapist else None,
            'room_number': transaction.room_number
        })
    
    return jsonify(payment_history)


@cashier_bp.post("/cashier/print-receipt")
def print_receipt_thermal():
    """Print receipt to thermal printer via ESC/POS socket."""
    cashier, auth_method = get_current_cashier()
    
    if not cashier:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    transaction_id = data.get('transaction_id')
    printer_host = data.get('printer_host', 'localhost')
    printer_port = data.get('printer_port', 9100)
    
    if not transaction_id:
        return jsonify({"error": "transaction_id required"}), 400
    
    transaction = Transaction.query.get(transaction_id)
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404
    
    payment = Payment.query.filter_by(transaction_id=transaction_id).first()
    if not payment:
        return jsonify({"error": "Payment not found"}), 404
    
    # Format receipt data
    services = []
    for item in transaction.items:
        service = Service.query.get(item.service_id)
        if service:
            services.append({
                'name': service.service_name,
                'duration_minutes': item.duration_minutes,
                'price': float(item.price)
            })
    
    receipt_data = {
        'code': transaction.code,
        'therapist_name': transaction.therapist.name if transaction.therapist else 'N/A',
        'room_number': transaction.room_number or 'N/A',
        'services': services,
        'total_amount': float(transaction.total_amount),
        'amount_paid': float(payment.amount_paid),
        'change_amount': float(payment.change_amount),
        'payment_method': payment.method,
        'payment_date': payment.created_at.strftime('%Y-%m-%d %H:%M:%S') if payment.created_at else ''
    }
    
    # Send to thermal printer
    printer = ThermalPrinter(host=printer_host, port=printer_port)
    success = printer.print_receipt(receipt_data)
    
    if success:
        return jsonify({"success": True, "message": "Receipt printed successfully"})
    else:
        return jsonify({"error": "Failed to connect to printer"}), 500
