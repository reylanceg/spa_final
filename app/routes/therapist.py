from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from ..models import Therapist, Room
from ..utils.auth_helpers import get_current_therapist
from .. import db, socketio

therapist_bp = Blueprint("therapist", __name__)


@therapist_bp.get("/therapist")
def therapist_page():
    # Use hybrid authentication (token-first, session fallback)
    therapist, auth_method = get_current_therapist()
    
    if not therapist:
        return redirect(url_for("auth.login_therapist_form"))
    
    return render_template("therapist.html", 
                         therapist_name=therapist.name, 
                         room_number=therapist.room_number)


@therapist_bp.get("/therapist/service-management")
def service_management_page():
    # Use hybrid authentication (token-first, session fallback)
    therapist, auth_method = get_current_therapist()
    
    if not therapist:
        return redirect(url_for("auth.login_therapist_form"))
    
    return render_template("service_management.html", 
                         therapist_name=therapist.name, 
                         room_number=therapist.room_number)


@therapist_bp.post("/therapist/toggle-room-status")
def toggle_room_status():
    """Toggle room status between available and preparing"""
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
