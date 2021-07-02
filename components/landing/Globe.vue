<template>
  <div ref="globe"></div>
</template>

<script>
import ThreeGlobe from "three-globe"
import * as THREE from "three"
import geojson from "~/assets/geojson/ne_110m_admin_0_countries.geojson"
import texture from "~/assets/images/texture.png"

export default {
  data() {
    return {
      globe: null,
      cube: null,
      renderer: null,
      scene: null,
      camera: null,
      tbControls: null,
      arcsData: [...Array(40).keys()].map(() => ({
        startLat: (Math.random() - 0.5) * 180,
        startLng: (Math.random() - 0.5) * 360,
        endLat: (Math.random() - 0.5) * 180,
        endLng: (Math.random() - 0.5) * 360,
        color: ["#00acee", "#aceeff", "#00ffac", "#aaef3e"][
          Math.round(Math.random() * 3)
        ],
      })),
    }
  },

  mounted() {
    this.init()
    this.animate()
    window.addEventListener(
      "resize",
      () => {
        this.camera.aspect =
          this.$refs.globe.clientWidth / this.$refs.globe.clientHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(
          this.$refs.globe.clientWidth,
          this.$refs.globe.clientHeight
        )
      },
      false
    )
  },

  methods: {
    init() {
      this.globe = new ThreeGlobe()
        .globeImageUrl(texture)
        .atmosphereColor("#aaaaaa")
        .arcsData(this.arcsData)
        .arcColor("color")
        .arcDashLength(1)
        .arcDashGap(5)
        .arcStroke(1)
        .arcDashInitialGap(() => Math.random() * 5)
        .arcDashAnimateTime(2000)
        .hexPolygonsData(geojson.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.5)
        .hexPolygonColor(() => `#aaaaaa`)

      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
      })
      this.renderer.setSize(
        this.$refs.globe.clientWidth,
        this.$refs.globe.clientHeight
      )

      this.$refs.globe.appendChild(this.renderer.domElement)

      this.scene = new THREE.Scene()
      this.scene.background = null
      this.scene.add(this.globe)
      this.scene.add(new THREE.AmbientLight(0xffffff))
      this.scene.add(new THREE.DirectionalLight(0xffffff, 0.8))

      this.camera = new THREE.PerspectiveCamera()
      this.camera.aspect =
        this.$refs.globe.clientWidth / this.$refs.globe.clientHeight
      this.camera.updateProjectionMatrix()
      this.camera.position.z = 300
    },

    animate() {
      this.renderer.render(this.scene, this.camera)
      requestAnimationFrame(this.animate)
      this.globe.rotation.y -= 0.005
    },
  },
}
</script>
