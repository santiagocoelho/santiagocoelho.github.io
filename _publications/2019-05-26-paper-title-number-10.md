---
title: "Population-based Bayesian regularization for microstructural diffusion MRI with NODDIDA"
collection: publications
permalink: /publication/2019-05-26-paper-title-number-10
excerpt: 'This paper proposed the use of a Bayesian population-based prior for robust estimation of NODDIDA parameters with limited acquisition protocols.'
date: 2019-05-26
venue: 'Magnetic Resonance in Medicine'
paperurl: 'https://onlinelibrary.wiley.com/doi/10.1002/mrm.27831'
citation: 'Meghdoot Mozumder, Jose M Pozo, Santiago Coelho, Alejandro F Frangi (2019). Population-based Bayesian regularization for microstructural diffusion MRI with NODDIDA. Magnetic Resonance in Medicine. 82(4):1553-1565.'
---

Information on the brain microstructure can be probed by Diffusion Magnetic Resonance Imaging (dMRI). Neurite Orientation Dispersion and Density Imaging with Diffusivities Assessment (NODDIDA) is one of the simplest microstructural model proposed. However, the estimation of the NODDIDA parameters from clinically plausible dMRI acquisition is ill-posed, and different parameter sets can describe the same measurements equally well. A few approaches to resolve this problem focused on developing better optimization strategies for this non-convex optimization. However, this fundamentally does not resolve ill-posedness. This article introduces a Bayesian estimation framework, which is regularized through knowledge from an extensive dMRI measurement set on a population of healthy adults (henceforth population-based prior).

We reformulate the problem as a Bayesian maximum a posteriori estimation, which includes as a special case previous approach using non-informative uniform priors. A population-based prior is estimated from 35 subjects of the MGH Adult Diffusion data (Human Connectome Project), acquired with an extensive acquisition protocol including high b-values. The accuracy and robustness of different approaches with and without the population-based prior is tested on subsets of the MGH dataset, and an independent dataset from a clinically comparable scanner, with only clinically plausible dMRI measurements.

The population-based prior produced substantially more accurate and robust parameter estimates, compared to the conventional uniform priors, for clinically feasible protocols, without introducing any evident bias.

The use of the proposed Bayesian population-based prior can lead to clinically feasible and robust estimation of NODDIDA parameters without changing the acquisition protocol.


The paper can be accessed [here](https://onlinelibrary.wiley.com/doi/10.1002/mrm.27831)

Recommended citation: Meghdoot Mozumder, Jose M Pozo, Santiago Coelho, Alejandro F Frangi (2019). Population-based Bayesian regularization for microstructural diffusion MRI with NODDIDA. Magnetic Resonance in Medicine. 82(4):1553-1565.
