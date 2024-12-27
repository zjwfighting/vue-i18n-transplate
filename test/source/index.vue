<template>
    <div>模板</div>
</template>

<script>
    export default {
        data() {
            return {
                prefix: "你好",
                suffix: "世界"
            }
        },
        methods: {
            sayHi() {
                return `${this.prefix}毁灭${this.suffix}`
            }
        }
    }
</script>