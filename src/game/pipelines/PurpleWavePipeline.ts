
export class PurpleWavePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game: Phaser.Game) {
        super({
            game,
            name: "PurpleWavePipeline",
            fragShader: `
            precision mediump float;
            uniform sampler2D uMainSampler;
            uniform float uTime;
            varying vec2 outTexCoord;

            void main(void) {
                // Defines "living" wave motion
                float t = uTime * 0.003;
                
                // "Anchored" Wave:
                // We assume the "base" (thickest part) is at the bottom (y=1.0) and "tips" at top (y=0.0).
                // Amplitude increases as we go up (1.0 - uv.y).
                // Reduced factor from 0.03 to 0.005 for minimal movement as requested.
                float amplitude = (1.0 - outTexCoord.y) * 0.005; 
                
                // Complex Sine Wave:
                // Includes 'outTexCoord.x' in phase to make different columns sway slightly differently
                float wave = sin(outTexCoord.y * 3.0 + outTexCoord.x * 5.0 + t) * amplitude;
                 
                // Inverse displacement
                vec2 sampleUV = vec2(outTexCoord.x - wave, outTexCoord.y);
                
                // Sample the texture
                // Clamp Y to avoid sampling outside 0-1 range which might look glitchy at edges
                if (sampleUV.x < 0.0 || sampleUV.x > 1.0) {
                    gl_FragColor = vec4(0.0);
                } else {
                    vec4 color = texture2D(uMainSampler, sampleUV);
                    gl_FragColor = vec4(color.rgb * 0.7, color.a); // Reduce brightness by 30%
                }
            }
            `
        });
    }

    onPreRender() {
        this.set1f("uTime", this.game.loop.time);
    }
}
