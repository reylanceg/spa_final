from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from ..models import Therapist, Room, Transaction, TransactionStatus, TransactionItem, ServiceClassification, Service
from ..utils.auth_helpers import get_current_therapist
from .. import db, socketio

therapist_bp = Blueprint("therapist", __name__)


@therapist_bp.get("/therapist")
def therapist_page():
    # Use hybrid authentication (token-first, session fallback)
    therapist, auth_method = get_current_therapist()
    
    if not therapist:
        return redirect(url_for("auth.login_therapist_form"))
    
    print(f"[DEBUG] Auth method: {auth_method}, Therapist: {therapist.name}, Room: {therapist.room_number}")
    
    return render_template("therapist.html", 
                         therapist_name=therapist.name, 
                         room_number=therapist.room_number,
                         token=therapist.auth_token)


@therapist_bp.get("/therapist/service-management")
def service_management_page():
    # Use hybrid authentication (token-first, session fallback)
    therapist, auth_method = get_current_therapist()
    
    if not therapist:
        return redirect(url_for("auth.login_therapist_form"))

    print(therapist.name)
    
    return render_template("service_management.html", 
                         therapist_name=therapist.name, 
                         room_number=therapist.room_number)


@therapist_bp.post("/therapist/toggle-room-status")
def toggle_room_status():
    #Toggle room status between available and preparing
    therapist, auth_method = get_current_therapist()
    
    if not therapist:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Find the room associated with this therapist
    room = Room.query.filter_by(room_number=therapist.room_number).first()
    if not room:
        return jsonify({"error": "Room not found"}), 404
    
    # Toggle between available and preparing status
    if room.status == 'available':
        room.status = 'preparing'
        new_status = 'preparing'
        button_text = 'Available'
    else:
        room.status = 'available'
        new_status = 'available'
        button_text = 'On Break'
    
    try:
        db.session.commit()
        
        # Emit socket event to update monitor page
        socketio.emit('monitor_updated', {
            'room_number': room.room_number,
            'status': new_status
        })
        
        return jsonify({
            "success": True,
            "new_status": new_status,
            "button_text": button_text
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@therapist_bp.get("/therapist/finished-transactions")
def get_finished_transactions():
    """Get all finished transactions for the current therapist"""
    therapist, auth_method = get_current_therapist()
    
    if not therapist:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Query finished transactions for this therapist
    finished_transactions = Transaction.query.filter(
        Transaction.therapist_id == therapist.id,
        Transaction.status.in_([TransactionStatus.finished, TransactionStatus.paid])
    ).order_by(Transaction.service_finish_at.desc()).limit(50).all()
    
    # Format the transactions data
    transactions_data = []
    for transaction in finished_transactions:
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
        
        transactions_data.append({
            'id': transaction.id,
            'code': transaction.code,
            'status': transaction.status.value,
            'room_number': transaction.room_number,
            'total_amount': transaction.total_amount,
            'total_duration_minutes': transaction.total_duration_minutes,
            'service_start_at': transaction.service_start_at.strftime('%Y-%m-%d %H:%M:%S') if transaction.service_start_at else None,
            'service_finish_at': transaction.service_finish_at.strftime('%Y-%m-%d %H:%M:%S') if transaction.service_finish_at else None,
            'services': services
        })
    
    return jsonify(transactions_data)
