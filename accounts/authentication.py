from dataclasses import dataclass
from typing import List, Optional
from rest_framework_simplejwt.authentication import JWTAuthentication

@dataclass
class OdooUser:
    odoo_uid: int
    name: str
    login: str
    email: str
    role: str
    partner_id: Optional[int]
    employee_id: Optional[int]
    parent_id: Optional[int]
    child_ids: List[int]
    department_id: Optional[int]
    
    @property
    def is_authenticated(self):
        return True

class OdooJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        return OdooUser(
            odoo_uid=validated_token.get("odoo_uid"),
            name=validated_token.get("name"),
            login=validated_token.get("login"),
            email=validated_token.get("email"),
            role=validated_token.get("role"),
            partner_id=validated_token.get("partner_id"),
            employee_id=validated_token.get("employee_id"),
            parent_id=validated_token.get("parent_id"),
            child_ids=validated_token.get("child_ids", []),
            department_id=validated_token.get("department_id"),
        )
