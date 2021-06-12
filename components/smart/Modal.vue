<template>
  <transition name="modal" appear>
    <div class="modal-backdrop">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <slot name="header"></slot>
          </div>
          <div class="modal-body">
            <slot name="body"></slot>
            <!-- <div class="fade top"></div>
            <div class="fade bottom"></div> -->
          </div>
          <div v-if="hasFooterSlot" class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  computed: {
    hasFooterSlot() {
      return !!this.$slots.footer
    },
  },
}
</script>

<style scoped lang="scss">
.modal-backdrop {
  @apply fixed;
  @apply inset-0;
  @apply z-50;
  @apply w-full;
  @apply h-full;
  @apply flex;
  @apply items-center;
  @apply justify-center;
  @apply transition;
  @apply ease-in-out;
  @apply duration-150;

  background-color: rgba(0, 0, 0, 0.32);
}

.modal-wrapper {
  @apply flex;
  @apply items-center;
  @apply justify-center;
  @apply flex-1;
}

.modal-container {
  @apply relative;
  @apply flex;
  @apply flex-1;
  @apply flex-col;
  @apply m-2;
  @apply transition;
  @apply ease-in-out;
  @apply duration-150;
  @apply bg-primary;
  @apply rounded-lg;
  @apply shadow-2xl;
  @apply border;
  @apply border-tooltip;

  max-height: calc(100vh - 128px);
  max-width: 640px;
}

.modal-header {
  @apply pl-2;
}

.modal-body {
  @apply overflow-auto;
}

.modal-footer {
  @apply p-2;
}

/*
  * The following styles are auto-applied to elements with
  * transition="modal" when their visibility is toggled
  * by Vue.js.
  *
  * You can easily play with the modal transition by editing
  * these styles.
  */

.modal-enter,
.modal-leave-active {
  @apply opacity-0;
}

.modal-enter .modal-container,
.modal-leave-active .modal-container {
  @apply transform;
  @apply scale-90;
  @apply transition;
  @apply ease-in-out;
  @apply duration-150;
}

.fade {
  @apply absolute;
  @apply block;
  @apply transition;
  @apply ease-in-out;
  @apply duration-150;

  left: 16px;
  right: 20px;
  height: 32px;

  &.top {
    top: 68px;
    background: linear-gradient(to bottom, var(--primary-color), transparent);
  }

  &.bottom {
    bottom: 16px;
    background: linear-gradient(to top, var(--primary-color), transparent);
  }
}
</style>
