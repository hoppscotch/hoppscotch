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
          <div class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
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
  @apply duration-200;

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
  @apply p-2;
  @apply transition;
  @apply ease-in-out;
  @apply duration-200;
  @apply bg-bgColor;
  @apply rounded-lg;
  @apply shadow-2xl;

  max-height: calc(100vh - 128px);
  max-width: 720px;
}

.modal-body {
  @apply overflow-auto;
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
  @apply scale-75;
  @apply transition;
  @apply ease-in-out;
  @apply duration-200;
}

.fade {
  @apply absolute;
  @apply block;
  @apply transition;
  @apply ease-in-out;
  @apply duration-200;

  left: 16px;
  right: 20px;
  height: 32px;

  &.top {
    top: 68px;
    background: linear-gradient(to bottom, var(--bg-color), transparent);
  }

  &.bottom {
    bottom: 16px;
    background: linear-gradient(to top, var(--bg-color), transparent);
  }
}
</style>
