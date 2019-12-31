<template>
  <svg
    version="1.1"
    id="Capa_1"
    x="0px"
    y="0px"
    viewBox="0 0 612.001 612.001"
    style="enable-background:new 0 0 612.001 612.001;"
    xml:space="preserve"
  >
    <defs id="defs11" />
    <g id="g3826" transform="translate(-516.40798,-163.88978)">
      <circle
        :fill="color"
        transform="scale(1,-1)"
        style="stroke-width:1.19531453"
        r="178.70923"
        cy="-501.55591"
        cx="822.40845"
        id="circle3814"
      />
      <g id="g3820" transform="translate(516.40798,163.89028)">
        <g id="g3818">
          <path
            :fill="color"
            id="path3816"
            data-old_color="#202124"
            class="active-path"
            data-original="#202124"
            d="M 64.601,236.822 C 64.601,394.256 192.786,612 306.001,612 412.582,612 547.4,394.256 547.4,236.822 547.4,79.388 439.322,0 306,0 172.678,0 64.601,79.388 64.601,236.822 Z m 304.12,116.415 c 29.475,-29.475 70.598,-40.195 108.552,-32.173 8.021,37.954 -2.698,79.077 -32.173,108.552 -29.475,29.475 -70.598,40.195 -108.552,32.173 -8.022,-37.955 2.698,-79.078 32.173,-108.552 z M 134.727,321.063 c 37.954,-8.021 79.077,2.698 108.552,32.173 29.475,29.475 40.195,70.598 32.173,108.552 -37.954,8.021 -79.077,-2.698 -108.552,-32.173 -29.475,-29.476 -40.194,-70.598 -32.173,-108.552 z"
          />
        </g>
      </g>
    </g>
  </svg>
</template>

<style scoped lang="scss">
#circle3814 {
  /* fill: var(--fg-color); */
  fill: transparent;
}
/* #path3816 {
    fill: var(--bg-color);
  } */
</style>

<script>
export default {
  props: {
    color: {
      type: String
    }
  }
};
</script>
