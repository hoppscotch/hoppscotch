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
            <div class="fade top"></div>
            <div class="fade bottom"></div>
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
  position: fixed;
  z-index: 998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
}

.modal-container {
  position: relative;
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  margin: 16px;
  padding: 16px;
  transition: all 0.2s ease;
  background-color: var(--bg-color);
  border-radius: 16px;
  box-shadow: 0px 16px 70px rgba(0, 0, 0, 0.5);
  max-height: calc(100vh - 128px);
  max-width: 720px;
}

.modal-body {
  overflow: auto;
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
  opacity: 0;
}

.modal-enter .modal-container,
.modal-leave-active .modal-container {
  transform: scale(0.8);
  transition: all 0.2s ease-in-out;
}

.fade {
  position: absolute;
  left: 16px;
  right: 20px;
  display: block;
  height: 32px;
  transition: all 0.2s;

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
