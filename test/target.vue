<template>
  <div>
    <p>
      {{ $t("test.Hello") }} <br />
      {{ $t("test.WhoAreYou") }}
    </p>
    <p :title="$t('test.IAm')">
      <br />
      {{ $t("test.OkayOkay") }}
    </p>
  </div>
</template>
