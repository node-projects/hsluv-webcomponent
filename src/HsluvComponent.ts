import { BaseCustomWebComponentConstructorAppend, css, html } from "@node-projects/base-custom-webcomponent";
import { Hsluv } from "hsluv"

const conv = new Hsluv();

const symSliderHue = 0;
const symSliderSaturation = 1;
const symSliderLightness = 2;
const symSliderHueCounterText = 3;
const symSliderSaturationCounterText = 4;
const symSliderLightnessCounterText = 5;
const symHexText = 6;

const size = 400;
const squareSize = 8;
const outerCircleRadiusPixel = 190;
const height = size;
const width = size;


function intersectLineLine(a, b) {
    let x = (a.intercept - b.intercept) / (b.slope - a.slope);
    let y = a.slope * x + a.intercept;
    return { x: x, y: y };
}

function distanceFromOrigin(point) {
    return Math.sqrt(Math.pow(point.x, 2) + Math.pow(point.y, 2));
}

function distanceLineFromOrigin(line) {
    return Math.abs(line.intercept) / Math.sqrt(Math.pow(line.slope, 2) + 1);
}

function perpendicularThroughPoint(line, point) {
    let slope = -1 / line.slope;
    let intercept = point.y - slope * point.x;
    return { slope: slope, intercept: intercept };
}

function angleFromOrigin(point) {
    return Math.atan2(point.y, point.x);
}

function normalizeAngle(angle) {
    let m = 2 * Math.PI;
    return (angle % m + m) % m;
}

function lengthOfRayUntilIntersect(theta, line) {
    return line.intercept / (Math.sin(theta) - line.slope * Math.cos(theta));
}

function getPickerGeometry(lightness) {
    conv.calculateBoundingLines(lightness);
    let lines = [
        { slope: conv.r0s, intercept: conv.r0i },
        { slope: conv.r1s, intercept: conv.r1i },
        { slope: conv.g0s, intercept: conv.g0i },
        { slope: conv.g1s, intercept: conv.g1i },
        { slope: conv.b0s, intercept: conv.b0i },
        { slope: conv.b1s, intercept: conv.b1i }
    ];
    let numLines = lines.length;
    let outerCircleRadius = 0.0;
    let closestIndex = null;
    let closestLineDistance = null;
    let _g = 0;
    while (_g < numLines) {
        let i = _g++;
        let d = distanceLineFromOrigin(lines[i]);
        if (closestLineDistance == null || d < closestLineDistance) {
            closestLineDistance = d;
            closestIndex = i;
        }
    }
    let closestLine = lines[closestIndex];
    let perpendicularLine = { slope: 0 - 1 / closestLine.slope, intercept: 0.0 };
    let intersectionPoint = intersectLineLine(closestLine, perpendicularLine);
    let startingAngle = angleFromOrigin(intersectionPoint);
    let intersections = [];
    let intersectionPoint1;
    let intersectionPointAngle;
    //let relativeAngle;
    let _g2 = 0;
    let _g3 = numLines - 1;
    while (_g2 < _g3) {
        let i1 = _g2++;
        let _g = i1 + 1;
        while (_g < numLines) {
            let i2 = _g++;
            intersectionPoint1 = intersectLineLine(lines[i1], lines[i2]);
            intersectionPointAngle = angleFromOrigin(intersectionPoint1);
            //relativeAngle = intersectionPointAngle - startingAngle;
            intersections.push({
                line1: i1,
                line2: i2,
                intersectionPoint: intersectionPoint1,
                intersectionPointAngle: intersectionPointAngle,
                relativeAngle: normalizeAngle(intersectionPointAngle - startingAngle)
            });
        }
    }
    intersections.sort(function (a, b) {
        if (a.relativeAngle > b.relativeAngle) {
            return 1;
        } else {
            return -1;
        }
    });
    let orderedLines = [];
    let orderedVertices = [];
    let orderedAngles = [];
    let nextIndex;
    let currentIntersection;
    let intersectionPointDistance;
    let currentIndex = closestIndex;
    let _g4 = 0;
    let _g5 = intersections.length;
    while (_g4 < _g5) {
        let j = _g4++;
        currentIntersection = intersections[j];
        nextIndex = null;
        if (currentIntersection.line1 === currentIndex) {
            nextIndex = currentIntersection.line2;
        } else if (currentIntersection.line2 === currentIndex) {
            nextIndex = currentIntersection.line1;
        }
        if (nextIndex != null) {
            currentIndex = nextIndex;
            orderedLines.push(lines[nextIndex]);
            orderedVertices.push(currentIntersection.intersectionPoint);
            orderedAngles.push(currentIntersection.intersectionPointAngle);
            intersectionPointDistance = distanceFromOrigin(currentIntersection.intersectionPoint);
            if (intersectionPointDistance > outerCircleRadius) {
                outerCircleRadius = intersectionPointDistance;
            }
        }
    }
    return {
        lines: orderedLines,
        vertices: orderedVertices,
        angles: orderedAngles,
        outerCircleRadius: outerCircleRadius,
        innerCircleRadius: closestLineDistance
    };
}

function closestPoint(geometry, point) {
    let angle = angleFromOrigin(point);
    let numVertices = geometry.vertices.length;
    let relativeAngle;
    let smallestRelativeAngle = Math.PI * 2;
    let index1 = 0;
    let _g = 0;
    while (_g < numVertices) {
        let i = _g++;
        relativeAngle = normalizeAngle(geometry.angles[i] - angle);
        if (relativeAngle < smallestRelativeAngle) {
            smallestRelativeAngle = relativeAngle;
            index1 = i;
        }
    }
    let index2 = (index1 - 1 + numVertices) % numVertices;
    let closestLine = geometry.lines[index2];
    if (distanceFromOrigin(point) < lengthOfRayUntilIntersect(angle, closestLine)) {
        return point;
    }
    let perpendicularLine = perpendicularThroughPoint(closestLine, point);
    let intersectionPoint = intersectLineLine(closestLine, perpendicularLine);
    let bound1 = geometry.vertices[index1];
    let bound2 = geometry.vertices[index2];
    let upperBound;
    let lowerBound;
    if (bound1.x > bound2.x) {
        upperBound = bound1;
        lowerBound = bound2;
    } else {
        upperBound = bound2;
        lowerBound = bound1;
    }
    let borderPoint;
    if (intersectionPoint.x > upperBound.x) {
        borderPoint = upperBound;
    } else if (intersectionPoint.x < lowerBound.x) {
        borderPoint = lowerBound;
    } else {
        borderPoint = intersectionPoint;
    }
    return borderPoint;
}


function stringIsNumberWithinRange(string, min, max) {
    const middle = parseFloat(string);
    // May be NaN
    return min <= middle && middle <= max;
}

function equidistantSamples(numSamples) {
    // 6 -> [0, 0.2, 0.4, 0.6, 0.8, 1]
    const samples = [];
    for (let i = 0; i < numSamples; i++) {
        samples.push(i / (numSamples - 1));
    }
    return samples;
}

function addDragEventListener(element, options) {
    // Generic drag event listener, onDrag returns mouse position
    // relative to element, x and y normalized to [0, 1] range.
    const onDrag = options.onDrag;
    const dragZone = options.dragZone || function () {
        return true;
    };
    let dragging = false;

    function getCoordinates(event) {
        const rect = element.getBoundingClientRect();
        let clientX, clientY;
        if (event.touches) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }

        const width = rect.width;
        const height = rect.height;
        const x = (clientX - rect.left) / width;
        const y = (clientY - rect.top) / height;
        return {
            x: Math.min(1, Math.max(0, x)),
            y: Math.min(1, Math.max(0, y))
        };
    }

    function startEvent(event) {
        // Ignore right click
        if (event.which !== 3) {
            const coordinates = getCoordinates(event);
            if (dragZone(coordinates)) {
                dragging = true;
                event.preventDefault();
                onDrag(coordinates);
            }
        }
    }

    function endEvent() {
        dragging = false;
    }

    function moveEvent(event) {
        if (dragging) {
            event.preventDefault();
            onDrag(getCoordinates(event));
        }
    }

    element.addEventListener('mousedown', startEvent);
    element.addEventListener('touchstart', startEvent);
    document.addEventListener('mousemove', moveEvent);
    document.addEventListener('touchmove', moveEvent);
    document.addEventListener('mouseup', endEvent);
    document.addEventListener('touchend', endEvent);
}

class Slider {
    element: any;
    val: number;
    handle: HTMLDivElement;
    rangeWidth: number;
    constructor(element, initVal, onChange) {
        const self = this;
        this.element = element;
        this.val = initVal;
        this.handle = document.createElement('div');
        this.handle.className = 'range-slider-handle';
        this.rangeWidth = this.element.getBoundingClientRect().width;
        element.appendChild(this.handle);

        function sliderDragListener(point) {
            self.setVal(point.x);
            onChange(point.x);
        }

        addDragEventListener(this.element, { onDrag: sliderDragListener });
    }

    setVal(newVal) {
        this.val = newVal;
        this.handle.style.left = (this.val * this.rangeWidth - 5) + 'px';
    }

    setBackground(hexColors) {
        this.element.style.background = 'linear-gradient(to right,' + hexColors.join(',') + ')';
    }
}

export class HsluvComponent extends BaseCustomWebComponentConstructorAppend {

    static override readonly style = css`
        :host {
            display: block;
            box-sizing: border-box;

            background-color: #1b1b1b;

            --text-color: #888;
            --slider-handle-color: white;
            --outer-circle-color: white;
        }
        :host([hidden]) {
            display: none
        }

        /* hide spinners on <input type="number"> */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        
        input[type=number] {
            -moz-appearance: textfield;
        }
        
        td.cell-green {
            background-color: #9f9;
        }
        
        td.cell-red {
            background-color: #f99;
        }
        
        figure {
            margin: 0.2em;
        }
        
        figure img {
            max-width: 100%;
        }
        
        figcaption {
            font-size: 0.8em;
            font-weight: bold;
        }
        
        #display {
            position: relative;
            width: 400px;
            height: 400px;
        }
        
        #picker {
            width: 400px;
            margin: auto;
        }
        
        #picker td.cell-input {
            width: 80px;
            padding-right: 20px;
        }
        
        #picker td.cell-input input {
            margin: 0;
            height: 22px;
            background: transparent;
            outline: none;
            border: 1px solid #333;
            border-radius: 0;
            text-align: right;
            width: 100%;
            padding: 0 5px;
            color: var(--text-color);
        }
        
        #picker td.cell-input.cell-input-hex input {
            font-family: monospace;
            border-color: #555;
        }
        
        #picker table {
            margin-top: 20px;
            width: 100%;
        }
        
        #picker table td {
            padding: 5px 5px;
            vertical-align: top;
            border: none;
        }
        
        #picker table td.picker-label {
            color: var(--text-color);
            width: 30px;
            line-height: 22px;
        }
        
        #picker table .swatch {
            height: 100px;
        }
        
        #picker .explanation-text {
            margin-bottom: 60px;
            margin-top: 100px;
        }
        
        .range-slider {
            height: 22px;
            display: block;
            position: relative;
        }
        
        .range-slider-handle {
            display: inline-block;
            position: absolute;
            width: 6px;
            top: -2px;
            left: -5px;
            height: 100%;
            cursor: default;
            border: 2px solid var(--slider-handle-color);
            touch-action: pan-y;
            -ms-touch-action: pan-y;
        }`;

    static override readonly template = html`
        <div id="picker">
            <div id="display">
                <canvas style="position:absolute;left:0" height="400" width="400"></canvas>
                <svg style="position:absolute;left:0" height="400" width="400"></svg>
            </div>
            <table>
                <tr id="control-h">
                    <td class="cell-input">
                        <input type="number" min="0" max="360" step="any" class="counter counter-hue" tabindex="0"/>
                    </td>
                    <td><div class="range-slider"></div></td>
                    <td class="picker-label">H</td>
                </tr>
                <tr id="control-s">
                    <td class="cell-input">
                        <input type="number" step="any" min="0" max="100" class="counter counter-saturation"/>
                    </td>
                    <td><div class="range-slider"></div></td>
                    <td class="picker-label">S</td>
                </tr>
                <tr id="control-l">
                    <td class="cell-input">
                        <input type="number" step="any" min="0" max="100" class="counter counter-lightness"/>
                    </td>
                    <td><div class="range-slider"></div></td>
                    <td class="picker-label">L</td>
                </tr>
                <tr>
                    <td class="cell-input cell-input-hex">
                        <input class="input-hex" pattern="#?[0-9a-fA-F]{6}"/>
                    </td>
                    <td><div class="swatch"></div></td>
                    <td></td>
                </tr>
            </table>
        </div>`;

    static readonly properties = {
        value: String
    }

    private _value: string;
    get value() { return this._value; }
    set value(value: string) {
        this._value = value;
        if (this._elInputHex?.value != value) {
            this._elInputHex.value = value;
            this._parseHexInput();
        }
    }

    private _elInputHex: HTMLInputElement;
    private _parseHexInput: () => void;

    constructor() {
        super();
        this._restoreCachedInititalValues();

        let H = 0;
        let S = 100;
        let L = 50;
        let scale = 1;
        let pickerGeometry;
        let contrasting;

        const picker = this._getDomElement('picker');
        const ctx = picker.getElementsByTagName('canvas')[0].getContext('2d');
        const elControlL = this._getDomElement('control-l');
        const elControlS = this._getDomElement('control-s');
        const elControlH = this._getDomElement('control-h');
        const elSliderL = <HTMLInputElement>elControlL.getElementsByClassName('range-slider')[0];
        const elSliderS = <HTMLInputElement>elControlS.getElementsByClassName('range-slider')[0];
        const elSliderH = <HTMLInputElement>elControlH.getElementsByClassName('range-slider')[0];
        const elInputHex = <HTMLInputElement>picker.getElementsByClassName('input-hex')[0];
        this._elInputHex = elInputHex;
        const elCounterHue = <HTMLInputElement>picker.getElementsByClassName('counter-hue')[0];
        const elCounterSaturation = <HTMLInputElement>picker.getElementsByClassName('counter-saturation')[0];
        const elCounterLightness = <HTMLInputElement>picker.getElementsByClassName('counter-lightness')[0];
        const elSwatch = <HTMLDivElement>picker.getElementsByClassName('swatch')[0];
        const elSvg = picker.getElementsByTagName('svg')[0];

        const sliderL = new Slider(elSliderL, 0.5, function (newVal) {
            L = newVal * 100;
            redrawAfterUpdatingVariables(false, false, true, symSliderLightness);
        });

        const sliderS = new Slider(elSliderS, 0.5, function (newVal) {
            S = newVal * 100;
            redrawAfterUpdatingVariables(false, true, false, symSliderSaturation);
        });

        const sliderH = new Slider(elSliderH, 0, function (newVal) {
            H = newVal * 360;
            redrawAfterUpdatingVariables(true, false, true, symSliderHue);
        });

        elCounterHue.addEventListener('input', () => {
            if (stringIsNumberWithinRange(elCounterHue.value, 0, 360)) {
                H = parseFloat(elCounterHue.value);
                redrawAfterUpdatingVariables(true, false, false, symSliderHueCounterText);
            }
        });

        elCounterSaturation.addEventListener('input', () => {
            if (stringIsNumberWithinRange(elCounterSaturation.value, 0, 100)) {
                S = parseFloat(elCounterSaturation.value);
                redrawAfterUpdatingVariables(false, true, false, symSliderSaturationCounterText);
            }
        });

        elCounterLightness.addEventListener('input', () => {
            if (stringIsNumberWithinRange(elCounterLightness.value, 0, 100)) {
                L = parseFloat(elCounterLightness.value);
                redrawAfterUpdatingVariables(false, false, true, symSliderLightnessCounterText);
            }
        });

        function toPixelCoordinate(point) {
            return {
                x: point.x * scale + 200,
                y: 200 - point.y * scale
            }
        }

        function fromPixelCoordinate(point) {
            return {
                x: (point.x - 200) / scale,
                y: (200 - point.y) / scale
            }
        }

        const centerPoint = toPixelCoordinate({ x: 0, y: 0 });

        const pastelBoundary = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pastelBoundary.setAttribute('cx', centerPoint.x.toString());
        pastelBoundary.setAttribute('cy', centerPoint.y.toString());
        pastelBoundary.setAttribute('fill', 'none');
        pastelBoundary.setAttribute('stroke-width', '2');
        elSvg.appendChild(pastelBoundary);

        const elementCenter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        elementCenter.setAttribute('cx', centerPoint.x.toString());
        elementCenter.setAttribute('cy', centerPoint.y.toString());
        elementCenter.setAttribute('r', (2).toString());
        elSvg.appendChild(elementCenter);

        const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        outerCircle.setAttribute('cx', centerPoint.x.toString());
        outerCircle.setAttribute('cy', centerPoint.y.toString());
        outerCircle.setAttribute('r', outerCircleRadiusPixel.toString());
        outerCircle.setAttribute('fill', 'none');
        outerCircle.setAttribute('stroke', 'var(--outer-circle-color)');
        outerCircle.setAttribute('stroke-width', '1');
        elSvg.appendChild(outerCircle);

        const pickerScope = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pickerScope.setAttribute('cx', centerPoint.x.toString());
        pickerScope.setAttribute('cy', centerPoint.y.toString());
        pickerScope.setAttribute('r', '4');
        pickerScope.setAttribute('fill', 'none');
        pickerScope.setAttribute('stroke-width', '2');
        pickerScope.style.display = 'none';
        pickerScope.classList.add('scope');
        elSvg.appendChild(pickerScope);

        function pickerDragListener(point) {
            let pointer = fromPixelCoordinate({
                x: point.x * size,
                y: point.y * size
            });
            pointer = closestPoint(pickerGeometry, pointer);

            const u = pointer.x;
            const v = pointer.y;
            conv.luv_l = L;
            conv.luv_u = u;
            conv.luv_v = v;
            conv.luvToLch();
            conv.lchToHsluv();
            H = conv.hsluv_h;
            S = conv.hsluv_s;
            redrawAfterUpdatingVariables(true, true, false, null);
        }

        function pickerDragZone(point) {
            // Don't allow dragging to start when clicked outside outer circle
            const maximumDistance = pickerGeometry.outerCircleRadius;
            const actualDistance = distanceFromOrigin(fromPixelCoordinate({
                x: point.x * size,
                y: point.y * size
            }));
            return actualDistance < maximumDistance;
        }

        addDragEventListener(elSvg, { onDrag: pickerDragListener, dragZone: pickerDragZone });

        function redrawCanvas() {
            const shapePointsPixel = pickerGeometry.vertices.map(toPixelCoordinate);

            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';

            if (L === 0 || L === 100) {
                return;
            }

            const xs = [];
            const ys = [];

            let point;
            for (let i = 0; i < shapePointsPixel.length; i++) {
                point = shapePointsPixel[i];
                xs.push(point.x);
                ys.push(point.y);
            }

            const xmin = Math.floor(Math.min.apply(Math, xs) / squareSize);
            const ymin = Math.floor(Math.min.apply(Math, ys) / squareSize);
            const xmax = Math.ceil(Math.max.apply(Math, xs) / squareSize);
            const ymax = Math.ceil(Math.max.apply(Math, ys) / squareSize);

            for (let x = xmin; x < xmax; x++) {
                for (let y = ymin; y < ymax; y++) {
                    let px = x * squareSize;
                    let py = y * squareSize;
                    let p = fromPixelCoordinate({
                        x: px + squareSize / 2,
                        y: py + squareSize / 2
                    });
                    let closest = closestPoint(pickerGeometry, p);
                    conv.luv_l = L;
                    conv.luv_u = closest.x;
                    conv.luv_v = closest.y;
                    conv.luvToXyz();
                    conv.xyzToRgb();
                    conv.rgbToHex();
                    ctx.fillStyle = conv.hex;
                    ctx.fillRect(px, py, squareSize, squareSize);
                }
            }
            ctx.globalCompositeOperation = 'destination-in';
            ctx.beginPath();
            ctx.moveTo(shapePointsPixel[0].x, shapePointsPixel[0].y);
            for (let j = 1; j < shapePointsPixel.length; j++) {
                point = shapePointsPixel[j];
                ctx.lineTo(point.x, point.y);
            }
            ctx.closePath();
            ctx.fill();
        }

        function redrawForeground() {
            elementCenter.setAttribute('fill', contrasting);
            pastelBoundary.setAttribute('stroke', contrasting);

            if (L !== 0 && L !== 100) {
                conv.calculateBoundingLines(L);
                let maxChroma = conv.calcMaxChromaHsluv(H);
                let chroma = maxChroma * S / 100;
                let hrad = H / 360 * 2 * Math.PI;
                let point = toPixelCoordinate({
                    x: chroma * Math.cos(hrad),
                    y: chroma * Math.sin(hrad)
                });

                pickerScope.setAttribute('cx', point.x.toString());
                pickerScope.setAttribute('cy', point.y.toString());
                pickerScope.setAttribute('stroke', contrasting);

                pickerScope.style.display = 'inline';
                pastelBoundary.setAttribute('r', (scale * pickerGeometry.innerCircleRadius).toString());

            } else {
                pickerScope.style.display = 'none';
                pastelBoundary.setAttribute('r', '0');
            }

            const hueColors = equidistantSamples(20).map(function (s) {
                conv.hsluv_h = s * 360;
                conv.hsluv_s = S;
                conv.hsluv_l = L;
                conv.hsluvToHex();
                return conv.hex;
            });
            const saturationColors = equidistantSamples(10).map(function (s) {
                conv.hsluv_h = H;
                conv.hsluv_s = s * 100;
                conv.hsluv_l = L;
                conv.hsluvToHex();
                return conv.hex;
            });
            const lightnessColors = equidistantSamples(10).map(function (s) {
                conv.hsluv_h = H;
                conv.hsluv_s = S;
                conv.hsluv_l = s * 100;
                conv.hsluvToHex();
                return conv.hex;
            });

            sliderH.setBackground(hueColors);
            sliderS.setBackground(saturationColors);
            sliderL.setBackground(lightnessColors);
        }

        let self = this;
        function redrawAfterUpdatingVariables(changeH, changeS, changeL, triggeredBySym) {
            if (changeL) {
                contrasting = L > 70 ? '#1b1b1b' : '#ffffff';
                pickerGeometry = getPickerGeometry(L);
                scale = outerCircleRadiusPixel / pickerGeometry.outerCircleRadius;
            }
            redrawForeground();
            conv.hsluv_h = H;
            conv.hsluv_s = S;
            conv.hsluv_l = L;
            conv.hsluvToHex();
            const hex = conv.hex;
            elSwatch.style.backgroundColor = hex;
            if (triggeredBySym !== symHexText) {
                elInputHex.value = hex;
                self.value = hex;
            }
            if (changeL)
                redrawCanvas();
            if (changeH && triggeredBySym !== symSliderHue)
                sliderH.setVal(H / 360);
            if (changeS && triggeredBySym !== symSliderSaturation)
                sliderS.setVal(S / 100);
            if (changeL && triggeredBySym !== symSliderLightness)
                sliderL.setVal(L / 100);
            if (changeH && triggeredBySym !== symSliderHueCounterText)
                elCounterHue.value = H.toFixed(1);
            if (changeS && triggeredBySym !== symSliderSaturationCounterText)
                elCounterSaturation.value = S.toFixed(1);
            if (changeL && triggeredBySym !== symSliderLightnessCounterText)
                elCounterLightness.value = L.toFixed(1);
        }

        let parseHexInput = () => {
            const match = elInputHex.value.match(/^\s*#?([\da-f]{6})\s*$/i);
            if (match) {
                const matchedHexDigits = match[1];
                conv.hex = '#' + matchedHexDigits;
                conv.hexToHsluv();
                H = conv.hsluv_h;
                S = conv.hsluv_s;
                L = conv.hsluv_l;
                redrawAfterUpdatingVariables(true, true, true, symHexText);
            }
        }
        elInputHex.addEventListener('input', parseHexInput);
        this._parseHexInput = parseHexInput;

        redrawAfterUpdatingVariables(true, true, true, null);
    }

    ready() {
        this._parseAttributesToProperties();
    }
}

