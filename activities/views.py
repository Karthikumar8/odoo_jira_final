from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from services.odoo_client import odoo_call
from .serializers import ActivitySerializer, MessageSerializer
from accounts.permissions import IsAnyRole

ACTIVITY_FIELDS = [
    "id", "res_model", "res_id", "activity_type_id", "summary", 
    "note", "date_deadline", "user_id", "state", "create_date"
]

class ActivityViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAnyRole]

    def list(self, request):
        res_model = request.query_params.get("res_model", "project.task")
        res_id = request.query_params.get("res_id") or request.query_params.get("task_id")
        
        if not res_id:
            return Response({"error": "res_id or task_id is mandatory."}, status=status.HTTP_400_BAD_REQUEST)

        domain = [
            ["res_model", "=", res_model],
            ["res_id", "=", int(res_id)]
        ]
        
        activities = odoo_call("mail.activity", "search_read", [domain], {
            "fields": ACTIVITY_FIELDS, 
            "order": "date_deadline asc"
        })
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)

    def get_metadata(self, request):
        types = odoo_call("mail.activity.type", "search_read", [[]], {"fields": ["id", "name", "icon"]})
        return Response({"activity_types": types})

    @action(detail=False, methods=['get'])
    def metadata(self, request):
        return self.get_metadata(request)

    def create(self, request):
        data = request.data.copy()
        if "res_model" not in data:
            data["res_model"] = "project.task"
        if "user_id" not in data or not data["user_id"]:
            data["user_id"] = request.user.odoo_uid
            
        serializer = ActivitySerializer(data=data)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            
            res_model_name = payload.get("res_model", "project.task")
            try:
                models = odoo_call("ir.model", "search_read", [[["model", "=", res_model_name]]], {"fields": ["id"]})
                if models:
                    payload["res_model_id"] = models[0]["id"]
            except Exception as e:
                return Response({"error": "Failed to resolve model ID"}, status=status.HTTP_400_BAD_REQUEST)

            new_id = odoo_call("mail.activity", "create", [payload])
            return Response({"id": new_id}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='done')
    def action_done(self, request, pk=None):
        try:
            odoo_call("mail.activity", "action_done", [[int(pk)]])
            return Response({"status": "success"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            odoo_call("mail.activity", "unlink", [[int(pk)]])
        except Exception:
            try:
                odoo_call("mail.activity", "write", [[int(pk)], {"active": False}])
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)

class MessageViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAnyRole]

    def list(self, request):
        res_model = request.query_params.get("res_model", "project.task")
        res_id = request.query_params.get("res_id")

        if not res_model or not res_id:
            return Response({"error": "res_model and res_id are mandatory."}, status=status.HTTP_400_BAD_REQUEST)

        domain = [
            ["model", "=", res_model],
            ["res_id", "=", int(res_id)],
            ["message_type", "in", ["comment", "notification", "email"]]
        ]
        
        try:
            messages = odoo_call("mail.message", "search_read", [domain], {
                "fields": ["id", "body", "date", "author_id", "tracking_value_ids"], 
                "order": "date desc",
                "limit": 50
            })
        except Exception:
            messages = odoo_call("mail.message", "search_read", [domain], {
                "fields": ["id", "body", "date", "author_id"], 
                "order": "date desc",
                "limit": 50
            })

        tracking_ids = []
        for msg in messages:
            if msg.get("tracking_value_ids"):
                tracking_ids.extend(msg["tracking_value_ids"])

        tracking_values_dict = {}
        if tracking_ids:
            # Odoo 19: 'field' column removed, use 'field_id' + 'field_desc' only
            try:
                tv_fields = [
                    "field_id", "field_desc",
                    "old_value_char", "new_value_char",
                    "old_value_datetime", "new_value_datetime",
                    "old_value_float", "new_value_float",
                    "old_value_integer", "new_value_integer",
                    "old_value_text", "new_value_text"
                ]
                tracking_values = odoo_call("mail.tracking.value", "search_read", [[["id", "in", tracking_ids]]], {
                    "fields": tv_fields
                })
                for tv in tracking_values:
                    old_val = tv.get("old_value_char") or tv.get("old_value_text") or tv.get("old_value_float") or tv.get("old_value_integer") or tv.get("old_value_datetime")
                    new_val = tv.get("new_value_char") or tv.get("new_value_text") or tv.get("new_value_float") or tv.get("new_value_integer") or tv.get("new_value_datetime")
                    field_id = tv.get("field_id")
                    field_name = field_id[1] if isinstance(field_id, list) and len(field_id) > 1 else ""
                    tracking_values_dict[tv["id"]] = {
                        "id": tv["id"],
                        "field": field_name,
                        "field_desc": tv.get("field_desc") or field_name,
                        "old_value": str(old_val) if old_val is not None and old_val is not False else "",
                        "new_value": str(new_val) if new_val is not None and new_val is not False else ""
                    }
            except Exception:
                # If tracking values fail, skip them gracefully
                pass

        for msg in messages:
            msg_tracking_values = []
            if msg.get("tracking_value_ids"):
                for tid in msg["tracking_value_ids"]:
                    if tid in tracking_values_dict:
                        msg_tracking_values.append(tracking_values_dict[tid])
            msg["tracking_values"] = msg_tracking_values

            if not msg.get("body"):
                msg["body"] = ""

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def create(self, request):
        res_model = request.data.get("res_model", "project.task")
        res_id = request.data.get("res_id")
        body = request.data.get("body")
        
        if not res_id or not body:
            return Response({"error": "res_id and body are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            new_id = odoo_call(res_model, "message_post", [[int(res_id)]], {"body": body, "message_type": "comment"})
            return Response({"id": new_id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
