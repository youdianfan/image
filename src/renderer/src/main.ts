import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import "./styles/global.css";
import router from "./router";
import App from "./App.vue";
import { i18n } from "./i18n";
import { useThemeStore } from "./stores/theme.store";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(i18n);
app.use(ElementPlus);

// Initialize theme before mount so the correct mode is applied immediately
const themeStore = useThemeStore();
themeStore.init();

app.mount("#app");
