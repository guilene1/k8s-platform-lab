{{/* The backend API tier. */}}
{{- define "lab-app.api" -}}
{{- $name := include "lab-app.name" . -}}
{{- $ctx := dict "root" . "component" "api" "version" (include "lab-app.tag" (dict "root" . "component" "api")) -}}
{{- $api := .Values.api -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ $name }}-api
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
spec:
  {{- if not $api.hpa.enabled }}
  replicas: {{ $api.replicas }}
  {{- end }}
  revisionHistoryLimit: 5
  selector:
    matchLabels:
      {{- include "lab-app.selector" $ctx | nindent 6 }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    metadata:
      labels:
        {{- include "lab-app.labels" $ctx | nindent 8 }}
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      terminationGracePeriodSeconds: 30
      {{- include "lab-app.spread" $ctx | nindent 6 }}
      containers:
        - name: api
          image: {{ include "lab-app.image" $ctx }}
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: {{ $api.port }}
          env:
            - name: PORT
              value: {{ $api.port | quote }}
            - name: APP_NAME
              value: {{ $name }}-api
            - name: PG_POOL_MAX
              value: {{ $api.dbPoolMax | quote }}
            {{- if .Values.storage.enabled }}
            - name: UPLOAD_DIR
              value: {{ .Values.storage.mountPath }}
            {{- end }}
            {{- range $k, $v := $api.env }}
            - name: {{ $k }}
              value: {{ $v | quote }}
            {{- end }}
          # PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD - synced from
          # AWS Secrets Manager by the ExternalSecret below.
          envFrom:
            - secretRef:
                name: {{ $name }}-db
          startupProbe:
            httpGet:
              path: /healthz
              port: http
            periodSeconds: 2
            failureThreshold: 30
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /readyz
              port: http
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2
          resources:
            {{- toYaml $api.resources | nindent 12 }}
          securityContext:
            {{- include "lab-app.containerSecurity" . | nindent 12 }}
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            {{- if .Values.storage.enabled }}
            - name: uploads
              mountPath: {{ .Values.storage.mountPath }}
            {{- end }}
      volumes:
        - name: tmp
          emptyDir:
            sizeLimit: 64Mi
        {{- if .Values.storage.enabled }}
        - name: uploads
          persistentVolumeClaim:
            claimName: {{ $name }}-uploads
        {{- end }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ $name }}-api
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
spec:
  type: ClusterIP
  selector:
    {{- include "lab-app.selector" $ctx | nindent 4 }}
  ports:
    - name: http
      port: {{ $api.port }}
      targetPort: http
{{- if $api.hpa.enabled }}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ $name }}-api
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ $name }}-api
  minReplicas: {{ $api.hpa.minReplicas }}
  maxReplicas: {{ $api.hpa.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ $api.hpa.cpuUtilization }}
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 120
{{- end }}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ $name }}-api
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
spec:
  minAvailable: 1
  selector:
    matchLabels:
      {{- include "lab-app.selector" $ctx | nindent 6 }}
---
# Prometheus scrapes /metrics on every API pod.
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {{ $name }}-api
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
spec:
  selector:
    matchLabels:
      {{- include "lab-app.selector" $ctx | nindent 6 }}
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s
{{- end -}}
