"""Fixed-initial-price growth and noise reduction; no current-price trigger."""
import math
import numpy as np

def adjustments(base,risk,vol,original_growth,noise_correction):
    weight=1-np.minimum(np.log(base)/math.log(25),1.)
    scale=1-.35*weight
    noise=np.empty((len(base),3))
    delta=np.empty(len(base))
    for i in range(len(base)):
        sigma=vol[risk[i]]*scale[i]
        q=noise_correction(sigma)
        w=noise_correction(sigma*1.5)
        noise[i]=[sigma,q,w]
        delta[i]=(.9*q+.1*w+math.log(1.05)/(365*1440)-original_growth[risk[i]]
            -weight[i]*math.log(1.05)/(30*17520))
    return noise,delta
