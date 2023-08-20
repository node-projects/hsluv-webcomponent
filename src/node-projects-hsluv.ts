import { HsluvComponent } from "./HsluvComponent.js";
export { HsluvComponent }

customElements.define('node-projects-hsluv', HsluvComponent);
declare global {
    interface HTMLElementTagNameMap {
        'node-projects-hsluv': HsluvComponent;
    }
}