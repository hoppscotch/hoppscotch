<template>
    <div class="color" :data-color="color">
        <span :style="{backgroundColor: color}" class="preview">
            <svg v-if="active" class="activeTick" width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M21 6.285l-11.16 12.733-6.84-6.018 1.319-1.49 5.341 4.686 9.865-11.196 1.475 1.285z"/></svg>
        </span>
        {{ name || color }}
    </div>
</template>

<style lang="scss">
    .color {
        display: inline-block;
        vertical-align: middle;

        padding: 8px 16px;
        margin: 4px;
        background-color: rgba(93, 93, 93, 0.2);
        border-radius: 4px;
        cursor: pointer;

        &.active {
            background-color: rgba(93, 93, 93, 0.3);
        }

        .preview {
            vertical-align: middle;
            display: inline-block;
            width: 32px;
            height: 32px;
            border-radius: 100%;
            margin-right: 8px;

            position: relative;
            .activeTick {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                fill: white;
            }
        }
    }

    .color.vibrant {
        .preview .activeTick {
            fill: black;
        }
    }
</style>

<script>
    export default {
        props: {
            'color': {
                type: String,
                required: true
            },
            'name': {
                type: String
            },

            'active': {
                type: Boolean,
                default: false
            }
        }
    }
</script>