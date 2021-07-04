<template>
  <div ref="globe"></div>
</template>

<script>
import ThreeGlobe from "three-globe"
import * as THREE from "three"
import TrackballControls from "three-trackballcontrols"
import geojson from "~/assets/geojson/ne_110m_admin_0_countries.geojson"
import texture from "~/assets/images/texture.png"

export default {
  data() {
    return {
      globe: null,
      renderer: null,
      scene: null,
      camera: null,
      tbControls: null,
      arcsData: [...Array(20).keys()].map(() => ({
        startLat: (Math.random() - 0.5) * 180,
        startLng: (Math.random() - 0.5) * 360,
        endLat: (Math.random() - 0.5) * 180,
        endLng: (Math.random() - 0.5) * 360,
        color: [
          ["#00acee", "#aceeff", "#00ffac", "#aaef3e"][
            Math.round(Math.random() * 3)
          ],
          ["#00acee", "#aceeff", "#00ffac", "#aaef3e"][
            Math.round(Math.random() * 3)
          ],
        ],
      })),
    }
  },

  computed: {
    labelsData() {
      const labelsData = []
      this.arcsData.forEach(
        ({ startLat, startLng, endLat, endLng, color }, linkIdx) =>
          [
            [startLat, startLng],
            [endLat, endLng],
          ].forEach(([lat, lng], edgeIdx) =>
            labelsData.push({
              lat,
              lng,
              color: color[edgeIdx],
              text: `${linkIdx} ${edgeIdx ? "tgt" : "src"}`,
            })
          )
      )
      return labelsData
    },
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

        // arcs layer
        .arcsData(this.arcsData)
        .arcColor("color")
        .arcDashLength(1)
        .arcDashGap(() => Math.random())
        .arcStroke(0.6)
        .arcDashInitialGap(() => Math.random() * 5)
        .arcDashAnimateTime(2000)

        // hex layer
        .hexPolygonsData(geojson.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.5)
        .hexPolygonColor(() => `#aaaaaa`)

        // labels layer
        .labelsData(this.labelsData)
        .labelLat("lat")
        .labelLng("lng")
        .labelText("text")
        .labelColor("color")
        .labelSize(1.2)
        .labelDotRadius(0.8)

      // Setup renderer
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
      })
      this.renderer.setSize(
        this.$refs.globe.clientWidth,
        this.$refs.globe.clientHeight
      )
      this.$refs.globe.appendChild(this.renderer.domElement)

      // Setup scene
      this.scene = new THREE.Scene()
      this.scene.background = null
      this.scene.add(this.globe)
      this.scene.add(new THREE.AmbientLight(0xffffff))
      this.scene.add(new THREE.DirectionalLight(0xffffff, 0.6))

      // Setup camera
      this.camera = new THREE.PerspectiveCamera()
      this.camera.aspect =
        this.$refs.globe.clientWidth / this.$refs.globe.clientHeight
      this.camera.updateProjectionMatrix()
      this.camera.position.z = 300

      // Add camera controls
      this.tbControls = new TrackballControls(
        this.camera,
        this.renderer.domElement
      )
      this.tbControls.rotateSpeed = 5
      this.tbControls.noZoom = true
      this.tbControls.noPan = true
    },

    animate() {
      this.renderer.render(this.scene, this.camera)
      this.tbControls.update()
      requestAnimationFrame(this.animate)
      this.globe.rotation.y -= 0.0025
    },
  },
}
</script>
