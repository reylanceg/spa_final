from flask import Blueprint, render_template, session, redirect, url_for
from ..models import Therapist

therapist_bp = Blueprint("therapist", __name__)


@therapist_bp.get("/therapist/")
def therapist_page():
    therapist_name = None
    room_number = None
    therapist_id = session.get("therapist_id")
    if therapist_id:
        t = Therapist.query.get(therapist_id)
        if t:
            therapist_name = t.name
            room_number = t.room_number
    else:
        return redirect(url_for("auth.login_therapist_form"))

    return render_template("therapist.html", therapist_name=therapist_name, room_number=room_number)
