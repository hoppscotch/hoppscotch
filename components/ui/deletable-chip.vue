<template>
  <span class="chip">
    <span><slot></slot></span>
    <i @click="$emit('chip-delete')" class="material-icons close-button">
      close
    </i>
  </span>
</template>

<style scoped lang="scss">
$borderRadius: 4px;
$padding: 0 12px;
$closeButtonSpacing: 6px;
$height: 32px;

.chip {
  display: inline-flex;
  align-items: center;
  color: var(--act-color);
  background: var(--ac-color);
  border-radius: $borderRadius;
  padding: $padding;
  font-weight: 700;
  height: $height;
}

.close-button {
  margin-left: $closeButtonSpacing;
  margin-right: -4px;
}
</style>
