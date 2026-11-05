# Synthetic Brain Diffusion MRI Phantom

Static, dependency-free prototype at `playground/diffSim.html`, linked from the homepage navigation. No build step; compatible with the existing GitHub Pages site. Published through the existing GitHub Pages workflow when changes are pushed to the publishing branch.

## Preview

From the website repository:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://localhost:8765/playground/diffSim.html. The page fetches a binary asset, so use HTTP rather than opening the HTML with `file://`.

## Data

One axial slice, z = 10.5 mm (slice 66), 145 × 174 pixels at 1.25 mm isotropic, generated with `BrainDiffusionPhantom` from its original 1.25 mm fODFs and masks. The source was found under `/Volumes/labspace-1/Santiago/BasisMRI/BrainPhantom/` during development. No full volume or raw HCP DWI is included.

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
python3 playground/scripts/export_phantom.py /path/to/generated/phantom --kernels /path/to/ARMNEXI-phantom
python3 playground/scripts/check_model.py
node --check playground/diffSim.js
```

The numerical check compares the production JavaScript SH basis to SciPy, compares WM SH synthesis to independent direct spherical quadrature for all three shells, and checks analytic CSF decay. Browser QA covers baseline normalization, shell/direction switching, spherical mean, slice normalization and SH truncation. No runtime CDN or external library is required. The LaTeX equation source is in `sh-equation.tex`, pre-rendered with Matplotlib mathtext into `sh-equation.svg`. `sphere500.js` stores the 500 directions and 996 triangle faces. The slice normalization toggle switches between S/S0 and the original b0-weighted display signal; it does not affect voxel readouts or SH surfaces.

Reference: https://mrtrix.readthedocs.io/en/dev/concepts/spherical_harmonics.html


## Diffusion tensor comparison

Run `python3 playground/scripts/fit_tensor.py` after re-exporting phantom data. This fits a fixed-S0 log-linear tensor to the synthesized b1000 shell on the same 500 directions. `tensor.bin` has eight float32 fields per pixel: Dxx, Dyy, Dzz, Dxy, Dxz, Dyz (µm²/ms), positive-definite validity flag, omitted-sample count. Nonphysical signals outside (0,1] are excluded, and invalid fits are shown without an ellipsoid. An analytic CSF D=3 check runs during export. Tensor ellipsoid axes scale with eigenvalues, not their square roots; it is not a displacement propagator.

The source fODF MIF header confirms `dwi2fod csd ... response_b3000.txt ... -lmax 6`. The website uses this CSD-derived result with the SH-only repair described below; it does not run a new CSD fit.


The 1.25 mm generated maps are kept outside the website repository at `/Users/coelhs01/Documents/ChatGPT/LabWebsite/phantom_1p25mm`. Only one slice is shipped. Re-export using `python3 playground/scripts/export_phantom.py /Users/coelhs01/Documents/ChatGPT/LabWebsite/phantom_1p25mm --z-mm 10.5`, followed by `python3 playground/scripts/fit_tensor.py`. The exporter selects the closest axial slice to the requested world z coordinate. Crosshair placement and initial voxel selection adapt to exported dimensions.

## Playground hub and PGSE visual experiment

`/playground/` links to the brain phantom and `playground/pgse.html`. The phantom defaults and resets to A–P (azimuth 90°, polar angle 90°). Its section 3 decay chart has a fixed 0–1 axis and clips out-of-range nonphysical values only for drawing.

The PGSE page is a fast educational visualization, not a research or scanner sequence tool. Vanilla JS and a worker keep it dependency-free. `pgse-engine.js` uses 1,200 seeded walkers/environment, 0.1 ms steps, and 101 playback snapshots with 80 visible trajectories. Gaussian echo is analytic; cylinder restriction is a finite-sample illustration. Changing controls cancels prior computation and debounces updates. Typical local updates are ~0.1–0.2 s, depending on hardware.

Physical units are ms, µm, mT/m, and µm²/ms internally. b is displayed in s/mm² (unit conversions included in phase and attenuation). Physical PGSE lobes share a sign; the effective gradient changes sign after RF refocusing. The cylinder uses specular reflection of short increments in x–y and free diffusion along z; animation shows the x–y projection. Gaussian diffusion has D_z = D_y. Direction inputs are normalized together on Apply (or Enter); the zero vector is rejected. Controls span δ = 1–30 ms, Δ = δ+1–100 ms, and G = 0–200 mT/m. The sequence displays the three physical gradient components G_i = G n_i. Finite-step and finite-sample errors are disclosed on the page. No export, scanner prescription, optimization, or fitting features are intended.

Run `node playground/scripts/check_pgse.cjs` to verify zero-gradient signal, stationary refocusing, G² scaling, Gaussian agreement, boundary containment, timestep stability, and a large-circle free-diffusion limit. Research examples and the user-supplied ISMRM course are linked in the page's further-exploration section.

PGSE browser scripts, styles, worker, and worker engine imports use a shared release query string. Bump this version in `pgse.html`, `pgse.js`, and `pgse-worker.js` together when changing the engine/UI contract so cached assets cannot mix incompatible releases.

## Within-voxel SH repair and map views

Slice 66 uses the original voxel's orientation coefficients, with a common positive scale applied to every l>0 SH coefficient only where necessary. The l=0 term, tissue parameters, b0, labels and response kernels are unchanged. This preserves fODF angular extrema and each shell's spherical mean; it reduces anisotropy. No neighbour interpolation is used. The same repaired coefficients synthesize all three shells (1000, 2000, 3000).

1,264 WM voxels were adjusted. An independent 30,000-direction check found no nonpositive, above-one, or shell-increasing full-order signals; all 11,142 tissue tensor fits are valid. In the previously invalid posterior callosal voxels, principal tensor direction changed by a median 0.119° (maximum 0.402°). This is a teaching correction, not measured ground truth or a guarantee of nonnegative fODFs. Lower-order truncation can still ring.

`data/anisotropy-scale.bin` stores one float32 scale per voxel; `repair-mask.bin` marks changed voxels. Original `odf_sh.nii` remains untouched. `odf_sh_local_repair_slice66.nii.gz` beside it contains the repaired slice in source SH units. Original and repaired exports are retained in `slice66_original/` and `slice66_local_sh/`; the earlier published slice is backed up in `published_slice72_backup/`.

```bash
python3 playground/scripts/repair_local_sh.py --data-dir /path/to/slice66_original --source /path/to/phantom_1p25mm --out /path/to/slice66_local_sh
python3 playground/scripts/fit_tensor.py --data-dir /path/to/slice66_local_sh
python3 playground/scripts/check_model.py --data-dir /path/to/slice66_local_sh
```

The DWI / color FA / b0 selector defaults to DWI. Color FA uses the b1000 tensor: RGB = FA × absolute principal eigenvector in RAS coordinates. Its compact direction sphere overlays the image without changing the canvas layout. The signal chart offers explicit Linear (0–1) and Log (0.01–1) choices.

The b0 map has its own display gain (default 1×, versus DWI 3×), giving it a threefold higher default upper display limit. Switching maps preserves each gain; Reset restores both defaults.
