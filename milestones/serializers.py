from rest_framework import serializers

class MilestoneSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=512)
    sequence = serializers.IntegerField(default=10, required=False)
    project_id = serializers.JSONField(required=False, allow_null=True)
    deadline = serializers.DateField(required=False, allow_null=True)
    is_reached = serializers.BooleanField(default=False, required=False)
    reached_date = serializers.DateTimeField(required=False, allow_null=True)
    quantity_percentage = serializers.FloatField(read_only=True, required=False)
    task_ids = serializers.ListField(child=serializers.IntegerField(), read_only=True, required=False)

    def to_odoo(self, validated_data):
        payload = dict(validated_data)
        
        for m2o_field in ["project_id"]:
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
                    
        import datetime
        for date_field in ["deadline", "reached_date"]:
            if date_field in payload:
                val = payload[date_field]
                if isinstance(val, datetime.datetime):
                    payload[date_field] = val.strftime("%Y-%m-%d %H:%M:%S")
                elif isinstance(val, datetime.date):
                    payload[date_field] = val.strftime("%Y-%m-%d")

        return payload
