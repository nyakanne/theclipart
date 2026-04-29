import hashlib
import hmac
import secrets
import boto3
from base64 import b64encode, b64decode, urlsafe_b64encode
from cryptography.fernet import Fernet
from .config import get_settings

settings = get_settings()


def _kms_client():
    return boto3.client(
        'kms',
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
    )


def _local_fernet() -> Fernet:
    key = urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
    return Fernet(key)


def encrypt_pii(plaintext: str) -> str:
    """Encrypt PII with KMS when configured, otherwise with local Fernet."""
    if not settings.KMS_KEY_ID:
        return 'local:' + _local_fernet().encrypt(plaintext.encode()).decode()
    kms = _kms_client()
    resp = kms.generate_data_key(KeyId=settings.KMS_KEY_ID, KeySpec='AES_256')
    plaintext_key = resp['Plaintext']
    encrypted_key = b64encode(resp['CiphertextBlob']).decode()
    f = Fernet(b64encode(plaintext_key[:32]))
    ciphertext = f.encrypt(plaintext.encode()).decode()
    return f'{encrypted_key}:{ciphertext}'


def decrypt_pii(token: str) -> str:
    if token.startswith('local:'):
        return _local_fernet().decrypt(token[6:].encode()).decode()
    if token.startswith('dev:'):
        raw = b64decode(token[4:])
        key, ciphertext = raw[:44], raw[45:]
        return Fernet(key).decrypt(ciphertext).decode()
    encrypted_key, ciphertext = token.split(':', 1)
    kms = _kms_client()
    resp = kms.decrypt(CiphertextBlob=b64decode(encrypted_key))
    plaintext_key = resp['Plaintext']
    f = Fernet(b64encode(plaintext_key[:32]))
    return f.decrypt(ciphertext.encode()).decode()


def hash_identifier(value: str) -> str:
    """SHA-256 of normalised identifier for bloom-filter / breach comparisons."""
    normalised = value.strip().lower()
    return hashlib.sha256(normalised.encode()).hexdigest()


def generate_honey_alias(seed: str, token_type: str) -> str:
    """Deterministic but unpredictable alias for honey-token sentinel."""
    h = hmac.new(settings.SECRET_KEY.encode(), f'{token_type}:{seed}'.encode(), hashlib.sha256)  # type: ignore[attr-defined]
    return f'{h.hexdigest()[:16]}@{settings.HONEY_DOMAIN}'


def generate_scan_id() -> str:
    return secrets.token_urlsafe(16)
