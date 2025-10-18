# from __future__ import annotations
from datetime import datetime, timedelta
import enum
# # import random
# import string
# from typing import Optional, Any

from sqlalchemy import Integer, String, DateTime, Enum, ForeignKey, Float, Boolean, Column
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash

from .extensions import db, socketio

# Create Base class for the new models
Base = db.Model


class TransactionCounter(Base):
    __tablename__ = "transaction_counter"
    
    id = db.Column(Integer, primary_key=True)
    next_number = db.Column(Integer, nullable=False, default=1)


class TransactionStatus(enum.Enum):
    selecting = "selecting"
    pending_therapist = "pending_therapist"
    therapist_confirmed = "Therapist Confirmed"
    in_service = "In Service"
    finished = "finished"
    awaiting_payment = "awaiting_payment"
    paying = "paying"
    paid = "paid"


class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id = db.Column(Integer, primary_key=True, autoincrement=True)
    category_name = db.Column(String(100), unique=True, nullable=False)

    services = relationship(
        "Service", back_populates="category", cascade="all, delete-orphan"
    )


class Service(Base):
    __tablename__ = "services"

    id = db.Column(Integer, primary_key=True, autoincrement=True)
    category_id = db.Column(ForeignKey("service_categories.id"))
    service_name = db.Column(String(100), nullable=False)
    description = db.Column(String(255))

    category = relationship("ServiceCategory", back_populates="services")
    classifications = relationship(
        "ServiceClassification", back_populates="service", cascade="all, delete-orphan"
    )
    items = relationship("TransactionItem", back_populates="service")


class ServiceClassification(Base):
    __tablename__ = "service_classifications"

    id = db.Column(Integer, primary_key=True, autoincrement=True)
    service_id = db.Column(ForeignKey("services.id"))
    classification_name = db.Column(String(100), nullable=False)
    price = db.Column(Float, nullable=False)
    duration_minutes = db.Column(Integer, nullable=False, default=60)

    service = relationship("Service", back_populates="classifications")


class Therapist(db.Model):
    __tablename__ = "therapists"

    id = db.Column(Integer, primary_key=True)
    username = db.Column(String(80), unique=True, nullable=False)
    password_hash = db.Column(String(255), nullable=False)
    name = db.Column(String(120), unique=True, nullable=False)
    room_number = db.Column(String(20), nullable=True)
    active = db.Column(Boolean, default=True)
    auth_token = db.Column(String(255), nullable=True, unique=True)
    token_expires_at = db.Column(DateTime, nullable=True)

    transactions = relationship("Transaction", back_populates="therapist")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Cashier(db.Model):
    __tablename__ = "cashiers"

    id = db.Column(Integer, primary_key=True)
    username = db.Column(String(80), unique=True, nullable=False)
    password_hash = db.Column(String(255), nullable=False)
    name = db.Column(String(120), unique=True, nullable=False)
    counter_number = db.Column(String(20), nullable=True)
    active = db.Column(Boolean, default=True)
    auth_token = db.Column(String(255), nullable=True, unique=True)
    token_expires_at = db.Column(DateTime, nullable=True)

    payments = relationship("Payment", back_populates="cashier")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(Integer, primary_key=True)
    code = db.Column(String(4), unique=True)
    # customer_name = db.Column(String(120))

    status = db.Column(Enum(TransactionStatus), default=TransactionStatus.selecting, nullable=False)

    therapist_id = db.Column(ForeignKey("therapists.id"))
    therapist = relationship("Therapist", back_populates="transactions")

    room_number = db.Column(String(20))

    # cashier assigned (before payment)
    assigned_cashier_id = db.Column(ForeignKey("cashiers.id"))
    assigned_cashier = relationship("Cashier")

    total_amount = db.Column(Float, default=0.0)
    total_duration_minutes = db.Column(Integer, default=0)

    created_at = db.Column(DateTime, default=datetime.now)  # Use local time instead of UTC
    selection_confirmed_at = db.Column(DateTime)
    therapist_confirmed_at = db.Column(DateTime)
    service_start_at = db.Column(DateTime)
    service_finish_at = db.Column(DateTime)
    cashier_claimed_at = db.Column(DateTime)
    paid_at = db.Column(DateTime)

    items = relationship("TransactionItem", back_populates="transaction", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="transaction", uselist=False)

    @staticmethod
    def generate_code() -> str:
        # Get or create the counter record
        counter = db.session.query(TransactionCounter).first()
        if not counter:
            counter = TransactionCounter(next_number=1)
            db.session.add(counter)
            db.session.flush()
        
        # Get the current number and increment for next time
        current_number = counter.next_number
        counter.next_number += 1
        
        # Format as 4-digit padded integer (0001, 0002, etc.)
        return f"{current_number:04d}"

    def recompute_totals(self) -> None:
        total = 0.0
        total_duration = 0
        for item in self.items:
            total += item.price
            total_duration += item.duration_minutes
        self.total_amount = round(total, 2)
        self.total_duration_minutes = total_duration


class TransactionItem(db.Model):
    __tablename__ = "transaction_items"

    id = db.Column(Integer, primary_key=True)
    transaction_id = db.Column(ForeignKey("transactions.id", ondelete="CASCADE"))
    service_id = db.Column(ForeignKey("services.id"))
    service_classification_id = db.Column(ForeignKey("service_classifications.id"))

    price = db.Column(Float, nullable=False)
    duration_minutes = db.Column(Integer, nullable=False, default=60)

    transaction = relationship("Transaction", back_populates="items")
    service = relationship("Service", back_populates="items")
    service_classification = relationship("ServiceClassification")


class Room(db.Model):
    __tablename__ = "rooms"

    id = db.Column(Integer, primary_key=True)
    room_number = db.Column(String(20), unique=True, nullable=False)
    status = db.Column(String(20), default="available", nullable=False)  # available, occupied, preparing
    current_transaction_id = db.Column(ForeignKey("transactions.id"), nullable=True)
    # current_customer_name = db.Column(String(120), nullable=True)
    
    current_transaction = relationship("Transaction")


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(Integer, primary_key=True)
    transaction_id = db.Column(ForeignKey("transactions.id", ondelete="CASCADE"), unique=True)
    cashier_id = db.Column(ForeignKey("cashiers.id"))

    amount_due = db.Column(Float, nullable=False)
    amount_paid = db.Column(Float, nullable=False)
    change_amount = db.Column(Float, nullable=False, default=0.0)
    method = db.Column(String(40), default="cash")
    created_at = db.Column(DateTime, default=datetime.now)  # Use local time instead of UTC

    transaction = relationship("Transaction", back_populates="payment")
    cashier = relationship("Cashier", back_populates="payments")
