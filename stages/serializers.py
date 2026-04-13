from rest_framework import serializers

class StageSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=256)
    sequence = serializers.IntegerField(default=10, required=False)
    fold = serializers.BooleanField(default=False, required=False)
    color = serializers.IntegerField(default=0, required=False)
    project_ids = serializers.ListField(child=serializers.IntegerField(), default=list, required=False)
    mail_template_id = serializers.JSONField(required=False, allow_null=True)
    
    def to_odoo(self, validated_data):
        payload = dict(validated_data)
        if "project_ids" in payload:
            payload["project_ids"] = [(6, 0, payload["project_ids"])]
            
        for m2o_field in ["mail_template_id"]:
            if m2o_field in payload:
                val = payload[m2o_field]
                if isinstance(val, list) and val:
                    payload[m2o_field] = int(val[0])
                elif val is not None and val is not False and val != "":
                    try:
                        payload[m2o_field] = int(val)
                    except (ValueError, TypeError):
                        payload[m2o_field] = False
                else:
                    payload[m2o_field] = False
        return payload
