<script setup lang="ts">
const { toasts, remove } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="`toast-${t.type}`"
          @click="remove(t.id)"
        >
          <!-- Icon -->
          <svg v-if="t.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="15" height="15"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" class="toast-icon">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          <svg v-else-if="t.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="15" height="15"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" class="toast-icon">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="15" height="15"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" class="toast-icon">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>

          <span class="toast-msg">{{ t.message }}</span>

          <button class="toast-close" type="button" @click.stop="remove(t.id)">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-family: system-ui, -apple-system, sans-serif;
  min-width: 240px;
  max-width: 360px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  pointer-events: all;
  cursor: pointer;
  user-select: none;
  border: 0.5px solid transparent;
}

.toast-success {
  background: #f0fdf4;
  color: #166534;
  border-color: #bbf7d0;
}
.toast-error {
  background: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}
.toast-info {
  background: #eff6ff;
  color: #1e40af;
  border-color: #bfdbfe;
}

[data-theme="dark"] .toast-success {
  background: #052e16;
  color: #86efac;
  border-color: #166534;
}
[data-theme="dark"] .toast-error {
  background: #2d1a1a;
  color: #fca5a5;
  border-color: #7f1d1d;
}
[data-theme="dark"] .toast-info {
  background: #1e1b4b;
  color: #a5b4fc;
  border-color: #3730a3;
}

.toast-icon  { flex-shrink: 0; }
.toast-msg   { flex: 1; line-height: 1.4; }

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.5;
  padding: 0;
  display: flex;
  align-items: center;
}
.toast-close:hover { opacity: 1; }

/* Transitions */
.toast-enter-active { transition: all 0.22s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(24px); }
.toast-leave-to     { opacity: 0; transform: translateX(24px); }
</style>
