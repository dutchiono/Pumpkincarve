# Layer Refactor Specification

## Overview
Refactor the Gen2App wavefield system to have **independent, layer-specific controls**. Each harmonic wavefield rendering technique (Density Fields, Flow Fields, Contour Mapping) should have its own complete set of parameters. No shared controls should affect multiple visual elements.

## Current Problems

1. **Shared Parameters**: Wavefield parameters (`wavefieldBaseFreq`, `wavefieldAmplitude`, `wavefieldOctaves`, `wavefieldScale`) are shared across all three rendering techniques. Changing one affects all three.

2. **UI Organization**: Toggles for major sections (Flow Field Layer, Particle Layer, etc.) are not visible enough. Quick Wavefield Presets appear above layer toggles instead of below.

3. **Function Dependencies**: `getDataAdjustedParams()` and `getWavefieldValue()` use undefined variables (`wavefieldBaseFreq`, etc.) which need to be updated or replaced with layer-specific logic.

## Required Changes

### 1. State Variables (Already Defined)
The following independent state variables are already defined and correct:
- Density Fields: `densityBaseFreq`, `densityAmplitude`, `densityOctaves`, `densityScale`, `densityThreshold`, `densityIntensity`
- Flow Fields: `flowFieldBaseFreq`, `flowFieldAmplitude`, `flowFieldOctaves`, `flowFieldScale`, `flowLineLength`, `flowLineDensity`
- Contour Mapping: `contourBaseFreq`, `contourAmplitude`, `contourOctaves`, `contourScale`, `contourLevels`, `contourSmoothness`

### 2. Wavefield Value Functions (NEEDS REWRITE)
Create three separate functions:

```typescript
// For Density Fields
const getDensityWavefieldValue = (x: number, y: number, t: number): number => {
  const scale = musicalScales[densityScale as keyof typeof musicalScales] || musicalScales.major;
  let value = 0;
  for (let octave = 0; octave < densityOctaves; octave++) {
    const freq = densityBaseFreq * Math.pow(2, octave);
    const amplitude = densityAmplitude / Math.pow(2, octave);
    for (let i = 0; i < scale.length; i++) {
      const harmonicFreq = freq * scale[i];
      const phase = t * 0.01;
      value += amplitude * Math.sin(x * harmonicFreq + phase) * Math.cos(y * harmonicFreq + phase);
    }
  }
  return value;
};

// For Flow Fields (same pattern with flowField* parameters)
const getFlowFieldWavefieldValue = (x: number, y: number, t: number): number => { /* ... */ };

// For Contour Mapping (same pattern with contour* parameters)
const getContourWavefieldValue = (x: number, y: number, t: number): number => { /* ... */ };
```

### 3. Render Functions (UPDATE)
Update `renderDensityFields` to call `getDensityWavefieldValue` instead of `getWavefieldValue`.
Update `renderFlowFields` to call `getFlowFieldWavefieldValue` instead of `getWavefieldValue`.
Update `renderContourMapping` to call `getContourWavefieldValue` instead of `getWavefieldValue`.

### 4. Remove getDataAdjustedParams
Delete or deprecate `getDataAdjustedParams()` since it references undefined `wavefieldBaseFreq`, etc.
If Farcaster mood integration is still needed, apply adjustments within each layer's wavefield value function.

### 5. UI Organization

#### Current Structure (WRONG):
```
Left Panel:
  - Data Source Influence
  - Flow Field Colors
  - Flow Field Parameters
  - Particle Colors
  - Particle Movement
  - Particle Size
  - Data Integration Status
  - Harmonic Wavefield Layers (with shared "Wavefield Parameters")
  - Visual Presets

Right Panel:
  - Canvas Preview
  - Quick Wavefield Presets ⬅️ TOO HIGH
  - Buttons
```

#### Desired Structure (CORRECT):
```
Left Panel:
  - Data Source Influence
  - Visual Layer Toggles (NEW SECTION AT TOP)
    □ Flow Field Layer
    □ Particle Layer
    □ Density Fields Layer
    □ Flow Fields Layer
    □ Contour Mapping Layer
  - Flow Field Layer Controls (ONLY IF enableFlowFieldLayer)
    - Flow Field Colors
    - Flow Field Parameters
  - Particle Layer Controls (ONLY IF enableParticleLayer)
    - Particle Colors
    - Particle Movement
    - Particle Size
  - Density Fields Layer Controls (ONLY IF enableDensityFields)
    - Toggle: Enable/Disable
    - Base Frequency (slider)
    - Amplitude (slider)
    - Octaves (slider)
    - Musical Scale (dropdown)
    - Threshold (slider)
    - Intensity (slider)
  - Flow Fields Layer Controls (ONLY IF enableFlowFields)
    - Toggle: Enable/Disable
    - Base Frequency (slider)
    - Amplitude (slider)
    - Octaves (slider)
    - Musical Scale (dropdown)
    - Line Length (slider)
    - Line Density (slider)
  - Contour Mapping Layer Controls (ONLY IF enableContourMapping)
    - Toggle: Enable/Disable
    - Base Frequency (slider)
    - Amplitude (slider)
    - Octaves (slider)
    - Musical Scale (dropdown)
    - Contour Levels (slider)
    - Smoothness (slider)
  - Data Integration Status
  - Visual Presets

Right Panel:
  - Canvas Preview
  - Layer Toggles (MOVE HERE)
  - Quick Wavefield Presets (MOVED DOWN)
  - Buttons
```

### 6. Update Quick Preset Buttons
Replace all `setWavefield*` calls with layer-specific setters:

```typescript
// Dots Only button
onClick={() => {
  setEnableDensityFields(true);
  setEnableFlowFields(false);
  setEnableContourMapping(false);
  setDensityScale('major');           // was: setWavefieldScale
  setDensityBaseFreq(0.02);            // was: setWavefieldBaseFreq
  setDensityThreshold(0.3);
  setDensityIntensity(1.2);
}}

// Flow Lines button
onClick={() => {
  setEnableDensityFields(false);
  setEnableFlowFields(true);
  setEnableContourMapping(false);
  setFlowFieldScale('minor');         // was: setWavefieldScale
  setFlowFieldBaseFreq(0.015);        // was: setWavefieldBaseFreq
  setFlowLineLength(30);
  setFlowLineDensity(0.15);
}}

// Contours button
onClick={() => {
  setEnableDensityFields(false);
  setEnableFlowFields(false);
  setEnableContourMapping(true);
  setContourScale('pentatonic');      // was: setWavefieldScale
  setContourBaseFreq(0.01);           // was: setWavefieldBaseFreq
  setContourLevels(7);
  setContourSmoothness(0.5);
}}

// All Layers button
onClick={() => {
  setEnableDensityFields(true);
  setEnableFlowFields(true);
  setEnableContourMapping(true);
  setDensityScale('major');
  setFlowFieldScale('minor');
  setContourScale('chromatic');
  setDensityBaseFreq(0.01);
  setFlowFieldBaseFreq(0.015);
  setContourBaseFreq(0.008);
  setDensityOctaves(4);
  setFlowFieldOctaves(4);
  setContourOctaves(6);
  setDensityAmplitude(1.5);
  setFlowFieldAmplitude(1.5);
  setContourAmplitude(1.5);
}}
```

### 7. Update useEffect Dependencies
Remove undefined variables from the useEffect dependency array and add all layer-specific parameters:
```typescript
}, [particleCount, particleBaseSpeed, particleMinSize, particleMaxSize, particleChaosFactor,
    enableFarcasterMood, farcasterMood, flowColor1, flowColor2, particleColor1, particleColor2,
    particleFadeSpeed, particlePattern, enableFlowFieldLayer, enableParticleLayer,
    enableDensityFields, enableFlowFields, enableContourMapping,
    densityBaseFreq, densityAmplitude, densityOctaves, densityScale, densityThreshold, densityIntensity,
    flowFieldBaseFreq, flowFieldAmplitude, flowFieldOctaves, flowFieldScale, flowLineLength, flowLineDensity,
    contourBaseFreq, contourAmplitude, contourOctaves, contourScale, contourLevels, contourSmoothness]);
```

### 8. Update Data Integration Status Display
Replace `getDataAdjustedParams().adjustedScale` with a simple display of the currently enabled layer's scale, or remove entirely.

## Testing Checklist

- [ ] Density Fields render independently with their own parameters
- [ ] Flow Fields render independently with their own parameters
- [ ] Contour Mapping renders independently with its own parameters
- [ ] Changing Density parameters doesn't affect Flow or Contour
- [ ] All toggles appear in the correct order
- [ ] Quick presets work without errors
- [ ] No TypeScript errors about undefined variables
- [ ] Canvas updates when parameters change
- [ ] Preset save/load works correctly

## File to Modify
`app/gen2-creator/Gen2App.tsx`
