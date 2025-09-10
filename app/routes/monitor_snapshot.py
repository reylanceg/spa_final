from flask import Blueprint, jsonify
from ..models import Transaction, TransactionStatus, Therapist, Cashier
from sqlalchemy import distinct

snapshot_bp = Blueprint('monitor_snapshot', __name__)


@snapshot_bp.get('/monitor_snapshot/')
def monitor_snapshot():
    # WAITING: Shows transactions after customer confirms services, waiting for therapist
    waiting = Transaction.query.filter_by(status=TransactionStatus.pending_therapist).order_by(Transaction.selection_confirmed_at.asc()).all()
    
    # SERVING: Shows transactions after therapist confirms until service finished
    # This includes both therapist_confirmed and in_service statuses
    therapist_confirmed = Transaction.query.filter_by(status=TransactionStatus.therapist_confirmed).order_by(Transaction.therapist_confirmed_at.asc()).all()
    in_service = Transaction.query.filter_by(status=TransactionStatus.in_service).order_by(Transaction.service_start_at.asc()).all()
    
    # FINISHED: Shows transactions after service finished, waiting for cashier to claim
    finished = Transaction.query.filter_by(status=TransactionStatus.finished).order_by(Transaction.service_finish_at.asc()).all()
    
    # COUNTER: Shows transactions after cashier confirms payment assignment
    payment_assigned = Transaction.query.filter_by(status=TransactionStatus.awaiting_payment).order_by(Transaction.cashier_claimed_at.asc()).all()

    def s(tx):
        return {
            'id': tx.id,
            'code': tx.code,
            'customer_name': tx.customer_name,
            'therapist': tx.therapist.name if tx.therapist else None,
            'room_number': tx.room_number,
            'total_amount': tx.total_amount,
            'total_duration_minutes': tx.total_duration_minutes,
            'cashier': tx.assigned_cashier.name if tx.assigned_cashier else None,
            'counter': tx.assigned_cashier.counter_number if tx.assigned_cashier else None,
            'status': tx.status.value,  # Include status for frontend logic
            'service_start_at': tx.service_start_at.isoformat() if tx.service_start_at else None,  # Add timer data
            'selected_services': [
                {
                    'service_name': item.service.service_name,
                    'price': item.price,
                    'duration_minutes': item.duration_minutes,
                    'classification_name': item.service_classification.classification_name
                } for item in tx.items
            ]
        }

    # Combine therapist_confirmed and in_service for the SERVING section
    serving = therapist_confirmed + in_service

    return jsonify({
        'waiting': [s(t) for t in waiting],
        'serving': [s(t) for t in serving],
        'finished': [s(t) for t in finished],  # Add finished transactions for cashier page
        'payment_assigned': [s(t) for t in payment_assigned],
    })


@snapshot_bp.get('/room_status/')
def room_status():
    """Get the status of all rooms in the system"""
    from ..models import Room
    
    # Get all rooms from the Room table
    rooms = Room.query.all()
    
    room_statuses = []
    
    for room in rooms:
        # Check if room has active transactions that override the base status
        in_service_transaction = Transaction.query.filter_by(
            room_number=room.room_number, 
            status=TransactionStatus.in_service
        ).first()
        
        preparing_transaction = Transaction.query.filter_by(
            room_number=room.room_number, 
            status=TransactionStatus.therapist_confirmed
        ).first()
        
        # Determine final status based on transactions and room status
        if in_service_transaction:
            status = "on_going_service"  # Service is actively running
            transaction_code = in_service_transaction.code
            customer_name = in_service_transaction.customer_name
            service_start_at = in_service_transaction.service_start_at.isoformat() if in_service_transaction.service_start_at else None
            total_duration_minutes = in_service_transaction.total_duration_minutes
            transaction_id = in_service_transaction.id
        elif preparing_transaction:
            status = "occupied"  # Room is occupied when therapist confirmed but service not started
            transaction_code = preparing_transaction.code
            customer_name = preparing_transaction.customer_name
            service_start_at = None
            total_duration_minutes = None
            transaction_id = preparing_transaction.id
        else:
            # Use the room's actual status from the Room table
            status = room.status
            transaction_code = None
            customer_name = None
            service_start_at = None
            total_duration_minutes = None
            transaction_id = None
        
        room_statuses.append({
            'room_number': room.room_number,
            'status': status,
            'transaction_code': transaction_code,
            'customer_name': customer_name,
            'service_start_at': service_start_at,
            'total_duration_minutes': total_duration_minutes,
            'transaction_id': transaction_id
        })
    
    return jsonify({'rooms': room_statuses})


@snapshot_bp.get('/cashier_status/')
def cashier_status():
    """Get the status of all cashiers and their assigned transactions"""
    # Get all active cashiers
    cashiers = Cashier.query.filter_by(active=True).order_by(Cashier.counter_number).all()
    
    cashier_statuses = []
    
    for cashier in cashiers:
        # Check if cashier has any transactions awaiting payment
        awaiting_transactions = Transaction.query.filter_by(
            assigned_cashier_id=cashier.id,
            status=TransactionStatus.awaiting_payment
        ).all()
        
        # Check if cashier has any transactions currently being paid
        paying_transactions = Transaction.query.filter_by(
            assigned_cashier_id=cashier.id,
            status=TransactionStatus.paying
        ).all()
        
        # Combine all transactions for this cashier
        all_transactions = awaiting_transactions + paying_transactions
        
        cashier_statuses.append({
            'id': cashier.id,
            'name': cashier.name,
            'counter_number': cashier.counter_number or str(cashier.id),
            'transaction_count': len(all_transactions),
            'transactions': [
                {
                    'id': tx.id,
                    'code': tx.code,
                    'customer_name': tx.customer_name,
                    'total_amount': tx.total_amount,
                    'status': tx.status.value
                } for tx in all_transactions
            ]
        })
    
    return jsonify({'cashiers': cashier_statuses})
