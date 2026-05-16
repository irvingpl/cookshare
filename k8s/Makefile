NAMESPACE  := cookshare
BACKEND_IMG := cookshare/backend:dev
FRONTEND_IMG := cookshare/frontend:dev

# ── 이미지 빌드 ────────────────────────────────────────────────────────────

.PHONY: build
build:
	docker build -f ../backend/Dockerfile.dev  -t $(BACKEND_IMG)  ..
	docker build -f ../frontend/Dockerfile.dev -t $(FRONTEND_IMG) ..

# minikube: 로컬 Docker 데몬에서 직접 빌드
.PHONY: build-minikube
build-minikube:
	eval $$(minikube docker-env) && \
	docker build -f ../backend/Dockerfile.dev  -t $(BACKEND_IMG)  .. && \
	docker build -f ../frontend/Dockerfile.dev -t $(FRONTEND_IMG) ..

# kind: 이미지 빌드 후 클러스터에 로드
.PHONY: build-kind
build-kind: build
	kind load docker-image $(BACKEND_IMG)
	kind load docker-image $(FRONTEND_IMG)

# ── 클러스터 배포 ──────────────────────────────────────────────────────────

.PHONY: apply
apply:
	kubectl apply -k .

.PHONY: delete
delete:
	kubectl delete -k . --ignore-not-found

# ── 상태 확인 ──────────────────────────────────────────────────────────────

.PHONY: status
status:
	@echo "\n=== Pods =============================="
	kubectl get pods -n $(NAMESPACE)
	@echo "\n=== Services =========================="
	kubectl get svc -n $(NAMESPACE)
	@echo "\n=== Ingress ==========================="
	kubectl get ingress -n $(NAMESPACE)
	@echo "\n=== PVC ==============================="
	kubectl get pvc -n $(NAMESPACE)

.PHONY: logs-backend
logs-backend:
	kubectl logs -n $(NAMESPACE) -l app=backend -f

.PHONY: logs-frontend
logs-frontend:
	kubectl logs -n $(NAMESPACE) -l app=frontend -f

# ── 로컬 접근 (Ingress 없이) ───────────────────────────────────────────────

.PHONY: forward
forward:
	@echo "백엔드 :4000 / 프론트엔드 :3000 포트포워딩 시작..."
	@echo "Ctrl-C 로 종료"
	kubectl port-forward -n $(NAMESPACE) svc/backend  4000:4000 & \
	kubectl port-forward -n $(NAMESPACE) svc/frontend 3000:3000 & \
	wait

.PHONY: forward-backend
forward-backend:
	kubectl port-forward -n $(NAMESPACE) svc/backend 4000:4000

.PHONY: forward-frontend
forward-frontend:
	kubectl port-forward -n $(NAMESPACE) svc/frontend 3000:3000

# ── 디버깅 ─────────────────────────────────────────────────────────────────

.PHONY: forward-debug
forward-debug:
	@echo "Node.js 디버거 포트포워딩 :9229"
	kubectl port-forward -n $(NAMESPACE) svc/backend 9229:9229

.PHONY: shell-backend
shell-backend:
	kubectl exec -it -n $(NAMESPACE) \
	  $$(kubectl get pod -n $(NAMESPACE) -l app=backend -o jsonpath='{.items[0].metadata.name}') \
	  -- sh

.PHONY: shell-frontend
shell-frontend:
	kubectl exec -it -n $(NAMESPACE) \
	  $$(kubectl get pod -n $(NAMESPACE) -l app=frontend -o jsonpath='{.items[0].metadata.name}') \
	  -- sh

# ── 데이터 관리 ────────────────────────────────────────────────────────────

.PHONY: db-shell
db-shell:
	kubectl exec -it -n $(NAMESPACE) \
	  $$(kubectl get pod -n $(NAMESPACE) -l app=backend -o jsonpath='{.items[0].metadata.name}') \
	  -- sqlite3 /data/cookshare.db

.PHONY: clean-data
clean-data:
	@echo "⚠ PVC 데이터를 삭제합니다. 계속하려면 Enter, 취소는 Ctrl-C"
	@read _
	kubectl delete pvc backend-data -n $(NAMESPACE) --ignore-not-found

# ── minikube 전용 ──────────────────────────────────────────────────────────

.PHONY: minikube-hosts
minikube-hosts:
	@echo "$$(minikube ip) cookshare.local" | sudo tee -a /etc/hosts
	@echo "✅ /etc/hosts 에 cookshare.local 추가 완료"

.PHONY: minikube-ingress
minikube-ingress:
	minikube addons enable ingress
	@echo "✅ Ingress 애드온 활성화 완료"

# ── 워크플로 단축키 ────────────────────────────────────────────────────────

# minikube 전체 셋업 (한 번에)
.PHONY: setup-minikube
setup-minikube: minikube-ingress build-minikube apply minikube-hosts
	@echo "\n✅ 완료! http://cookshare.local 로 접근하세요"

# kind 전체 셋업 (한 번에)
.PHONY: setup-kind
setup-kind: build-kind apply
	@echo "\n✅ 완료! make forward 로 포트포워딩 후 http://localhost:3000 접근"

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*' Makefile | \
	  awk -F: '{printf "  make %-22s\n", $$1}'
