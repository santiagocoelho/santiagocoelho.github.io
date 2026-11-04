# Synthetic Brain Diffusion MRI Phantom

Static, dependency-free prototype at `physics/diffSim.html`, linked from the homepage navigation. No build step; compatible with the existing GitHub Pages site. Published through the existing GitHub Pages workflow when changes are pushed to the publishing branch.

## Preview

From the website repository:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://localhost:8765/physics/diffSim.html. The page fetches a binary asset, so use HTTP rather than opening the HTML with `file://`.

## Data

One axial slice, z = 18 mm, 145 × 174 pixels at 1.25 mm isotropic, generated with `BrainDiffusionPhantom` from its original 1.25 mm fODFs and masks. The source was found under `/Volumes/labspace-1/Santiago/BasisMRI/BrainPhantom/` during development. No full volume or raw HCP DWI is included.

`data/phantom.bin` is a little-endian float32 array, pixel-major, with 47 floats per pixel (4,743,240 bytes). `phantom.json` describes dimensions, provenance and normalization. Fields:

- 0: tissue label (0 background, 1 WM, 2 GM, 3 CSF).
- 1: measured b0 divided by the slice's in-brain 99th percentile, clipped to [0,1].
- 2–6: WM f, Da, Da_perp, De_par, De_perp.
- 7–34: 28 orthonormal MRtrix real SH fODF coefficients, normalized to integral 1.
- 35–46: four Legendre response coefficients for each of b = 1000, 2000, 3000 s/mm².

These three shells are synthesized from the same phantom maps with the same ARMNEXI kernels, at b = 1,000, 2,000 and 3,000 s/mm². WM uses finite-radius Standard Model response, GM the NEXI response at Δ=30 ms, CSF isotropic D=3 µm²/ms. Optional soma maps are not used by this forward path. Low-c0 fODFs use an isotropic fallback (count recorded in metadata).

Spatial arrays are reoriented to canonical RAS and displayed radiologically (right on left, anterior up). SH coefficients remain in world RAS coordinates and are not rotated with the voxel array. Only the selected voxel’s fODF is displayed, as a 3D surface in the voxel panel. The voxel-panel glyphs are independently normalized in radius for visibility. The SH comparison uses 500 equal-area Fibonacci directions and a convex-hull triangulation, with a shared radial scale for full and truncated signals. Signed amplitudes are represented by absolute radius with negative regions colored red. Signal plots/readouts are normalized to S0, and retain signed values. Image intensities and glyph radii clip negative values for display. The image always uses full order 6; the SH control changes the voxel signal glyph and reconstruction plot only.

## Re-export and verify

Requires Python with numpy, scipy, nibabel; export also requires the local ARMNEXI-phantom source, and validation requires Node.

```bash
python3 physics/scripts/export_phantom.py /path/to/generated/phantom --kernels /path/to/ARMNEXI-phantom
python3 physics/scripts/check_model.py
node --check physics/diffSim.js
```

The numerical check compares the production JavaScript SH basis to SciPy, compares WM SH synthesis to independent direct spherical quadrature for all three shells, and checks analytic CSF decay. Browser QA covers baseline normalization, shell/direction switching, spherical mean, slice normalization and SH truncation. No runtime CDN or external library is required. The LaTeX equation source is in `sh-equation.tex`, pre-rendered with Matplotlib mathtext into `sh-equation.svg`. `sphere500.js` stores the 500 directions and 996 triangle faces. The slice normalization toggle switches between S/S0 and the original b0-weighted display signal; it does not affect voxel readouts or SH surfaces.

Reference: https://mrtrix.readthedocs.io/en/dev/concepts/spherical_harmonics.html


## Diffusion tensor comparison

Run `python3 physics/scripts/fit_tensor.py` after re-exporting phantom data. This fits a fixed-S0 log-linear tensor to the synthesized b1000 shell on the same 500 directions. `tensor.bin` has eight float32 fields per pixel: Dxx, Dyy, Dzz, Dxy, Dxz, Dyz (µm²/ms), positive-definite validity flag, omitted-sample count. Nonphysical signals outside (0,1] are excluded, and invalid fits are shown without an ellipsoid. An analytic CSF D=3 check runs during export. Tensor ellipsoid axes scale with eigenvalues, not their square roots; it is not a displacement propagator.

The source fODF MIF header confirms `dwi2fod csd ... response_b3000.txt ... -lmax 6`. The website reuses this CSD result rather than estimating new fODFs.


The 1.25 mm generated maps are kept outside the website repository at `/Users/coelhs01/Documents/ChatGPT/LabWebsite/phantom_1p25mm`. Only one slice is shipped. Re-export using `python3 physics/scripts/export_phantom.py /Users/coelhs01/Documents/ChatGPT/LabWebsite/phantom_1p25mm --z-mm 18`, followed by `python3 physics/scripts/fit_tensor.py`. The exporter selects the closest axial slice to the requested world z coordinate. Crosshair placement and initial voxel selection adapt to exported dimensions.
