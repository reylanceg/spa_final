from __future__ import annotations
from datetime import datetime
import enum
import random
import string
from typing import Optional

from sqlalchemy import Integer, String, DateTime, Enum, ForeignKey, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import generate_password_hash, check_password_hash

from .extensions import db


class TransactionStatus(enum.Enum):
    selecting = "selecting"
    pending_therapist = "pending_therapist"
    therapist_confirmed = "therapist_confirmed"
    in_service = "in_service"
    finished = "finished"
    awaiting_payment = "awaiting_payment"
    paying = "paying"
    paid = "paid"


class Service(db.Model):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    items: Mapped[list[TransactionItem]] = relationship("TransactionItem", back_populates="service")


class Therapist(db.Model):
    __tablename__ = "therapists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    room_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    transactions: Mapped[list[Transaction]] = relationship("Transaction", back_populates="therapist")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Cashier(db.Model):
    __tablename__ = "cashiers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    counter_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    payments: Mapped[list[Payment]] = relationship("Payment", back_populates="cashier")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Transaction(db.Model):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[Optional[str]] = mapped_column(String(12), unique=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(120))

    status: Mapped[TransactionStatus] = mapped_column(Enum(TransactionStatus), default=TransactionStatus.selecting, nullable=False)

    therapist_id: Mapped[Optional[int]] = mapped_column(ForeignKey("therapists.id"))
    therapist: Mapped[Optional[Therapist]] = relationship("Therapist", back_populates="transactions")

    room_number: Mapped[Optional[str]] = mapped_column(String(20))

    # cashier assigned (before payment)
    assigned_cashier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cashiers.id"))
    assigned_cashier: Mapped[Optional[Cashier]] = relationship("Cashier")

    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_duration_minutes: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    selection_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    therapist_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    service_start_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    service_finish_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    cashier_claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    items: Mapped[list[TransactionItem]] = relationship("TransactionItem", back_populates="transaction", cascade="all, delete-orphan")
    payment: Mapped[Optional[Payment]] = relationship("Payment", back_populates="transaction", uselist=False)

    @staticmethod
    def generate_code(length: int = 8) -> str:
        alphabet = string.ascii_uppercase + string.digits
        return "T" + "".join(random.choices(alphabet, k=length))

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

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id", ondelete="CASCADE"))
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"))

    price: Mapped[float] = mapped_column(Float, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    transaction: Mapped[Transaction] = relationship("Transaction", back_populates="items")
    service: Mapped[Service] = relationship("Service", back_populates="items")


class Payment(db.Model):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id", ondelete="CASCADE"), unique=True)
    cashier_id: Mapped[int] = mapped_column(ForeignKey("cashiers.id"))

    amount_due: Mapped[float] = mapped_column(Float, nullable=False)
    amount_paid: Mapped[float] = mapped_column(Float, nullable=False)
    change_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    method: Mapped[str] = mapped_column(String(40), default="cash")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    transaction: Mapped[Transaction] = relationship("Transaction", back_populates="payment")
    cashier: Mapped[Cashier] = relationship("Cashier", back_populates="payments")
