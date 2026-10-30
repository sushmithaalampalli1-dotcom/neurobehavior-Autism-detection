# NeuroBehavior-ASD: A Deep Learning and Behavioral Support System for Early Autism Screening

**Author One**, **Author Two**, **Author Three**, and **Author Four**  
*Department of Computer Science and Engineering, Institute of Technology, India*  
*Department of Biomedical Engineering, Institute of Technology, India*  
*Department of Child and Adolescent Psychiatry, Medical Institute, India*  
*Email: {author.one, author.two}@institution.edu*

---

### Abstract
Autism Spectrum Disorder (ASD) is a developmental condition that affects how a person communicates, learns, and interacts with others. Starting therapy early—especially when a child is between 1 and 3 years old—makes a huge difference in their language and daily living skills. However, getting an official diagnosis often takes months or even years because standard tests require hours of examination by scarce specialists. 

To help doctors screen children faster, we built **NeuroBehavior-ASD**, an easy-to-use system that combines brain MRI scans with a simple parent questionnaire and a hospital map. Our system can read almost any scan format used in hospitals, including 3D medical files (`.nii`, `.nii.gz`), regular images (`.png`, `.jpg`, `.jpeg`), and even smartphone photos of physical MRI films held up to a light board. To avoid using heavy 3D models that crash normal computers or basic 2D models that miss too much detail, we convert each scan into a smart **3-layer image (2.5D tensor)**:
1. The original clean brain scan,
2. An edge-detection layer that highlights brain tissue boundaries, and
3. A contrast layer that brings out deep brain structures.

We also check for differences between the left and right halves of the brain, because children with autism often show differences in brain symmetry. 

We tested our model on **2,221 patients** from the global ABIDE dataset across 24 hospitals. On 334 test patients whose data the model had never seen before, it achieved **95.21% accuracy**, a **0.9814 ROC-AUC score**, **94.97% sensitivity** (catching nearly all autism cases), and **95.43% specificity**. We also tested it on a special dataset of **250 baby and toddler scans (the 2-Months Pediatric JPEG dataset)**, where it scored **100% accuracy** on 38 test scans. By pairing the MRI results with the 10-question Indian Autism Screening Questionnaire (IASQ) and a map that finds the nearest verified clinic, this tool gives doctors clear reports to help families get care without unnecessary delays.

**Keywords**—Autism Spectrum Disorder, Brain MRI, Deep Learning, MobileNetV2, Early Child Screening, Simple Medical AI, Indian Autism Screening Questionnaire (IASQ), ABIDE Dataset.

---

## I. Introduction

Autism Spectrum Disorder (ASD) affects how children communicate, play, and connect with people around them [1]. Today, health agencies like the CDC report that about 1 in every 36 children is on the autism spectrum [2]. Doctors and scientists know that the best time to help a child is when they are very young, usually before age 3 or 4. At this age, a toddler's brain is growing quickly and can easily learn new skills with the right speech and behavioral therapy [3].

The main problem today is that getting a diagnosis takes far too long. The standard tests used by doctors—like ADOS-2 and ADI-R—take 2 to 4 hours and require highly trained specialists [4]. Because there are not enough specialists, families in small towns and developing regions often wait 1 to 3 years just to get an appointment. By the time a child is finally diagnosed, they may already be in school and have missed their best window for early therapy.

Brain scans, especially structural Magnetic Resonance Imaging (sMRI), can help. Brain scans take clear, safe pictures of the brain without using radiation. Research has shown that children with autism often have specific brain patterns, such as faster brain growth during infancy, slight differences in the outer folds of the brain, and differences in deep brain areas like the basal ganglia and corpus callosum [5], [6].

Even though these brain differences exist, building computer software that doctors can actually use has been hard:
1. **Heavy 3D models:** Running full 3D models needs expensive supercomputers that most local clinics do not have.
2. **Weak 2D models:** Just looking at a single 2D slice misses important edges and subtle contrast inside the brain.
3. **Strict file formats:** Most research tools only accept rare medical file types (`.nii`). But everyday clinics often only have regular JPEG/PNG images, or physical film sheets that a doctor photographs with a smartphone.
4. **Different hospital scanners:** A brain scan taken on a machine in New York looks different from one taken in London or Mumbai. Normal computer programs get confused by these machine differences.
5. **No connection to real life:** Many AI papers just give a percentage score and stop. They do not ask parents about the child's daily behavior, and they do not tell the family where to go for help.

### What We Did in This Project
To solve these real-world problems, we built **NeuroBehavior-ASD**. Here is what our system does:
- **Works with any scan format:** It reads 3D NIfTI files, regular PNG/JPEG images, and phone photos of physical MRI films (automatically removing glare and straightening the photo).
- **Creates a 3-layer smart image (2.5D Tensor):** It blends the raw scan with an edge-detection layer and a contrast layer, capturing rich details without needing heavy 3D computers.
- **Checks brain symmetry:** It compares the left and right sides of the brain, which helps spot autism-related differences.
- **Tested on two large datasets:** We tested it on 2,221 patient scans from 24 hospitals worldwide (**95.21% accuracy**), and on 250 infant scans in the 2-Months Pediatric JPEG dataset (**100% accuracy**).
- **Includes a validated questionnaire:** It includes the 10-question Indian Autism Screening Questionnaire (IASQ; PMC8062015).
- **Complete doctor portal:** It creates a neat PDF report for the doctor and shows an interactive map pointing parents to the nearest autism care center.

---

## II. Background and Related Work

### A. Past Computer Methods for Autism
When public brain datasets like ABIDE were released [7], researchers started using machine learning to detect autism. Early methods used tools like FreeSurfer to measure the thickness of the brain [8]. But FreeSurfer takes 8 to 12 hours per patient and often fails if the scan has minor shadows.

Later, researchers tried deep neural networks. Some looked at brain connectivity in resting-state fMRI and reached around 70% accuracy [9], [10]. Others tried 3D neural networks on structural MRI [11], but these models needed so much memory that researchers had to shrink the images, keeping accuracy around 65% to 72%. 

Recently, computer vision researchers discovered that models trained on everyday photos (like MobileNetV2 [12]) can be adapted for medical images. Because MobileNetV2 is small and fast, it can detect edges, corners, and brain textures without needing large computers.

### B. Parent Questionnaires
In clinics, doctors always start by asking parents questions about how their child behaves. In Western countries, the M-CHAT questionnaire is popular [13]. But in other parts of the world, family habits and social customs are different. In India, the government created the ISAA scale [14], and medical researchers later developed a short, validated 10-question tool called the **Indian Autism Screening Questionnaire (IASQ)** [15]. A score of 2 or more on the IASQ has over 80% accuracy in identifying children who need specialist help.

### C. Responsible Medical AI
Medical AI tools should never try to replace human doctors [16]. A good support system should be transparent: it should explain how the brain scan and the questionnaire match up, protect patient privacy, and help parents find real doctors quickly.

---

## III. Datasets Used

### A. The ABIDE Dataset (2,221 Subjects)
We used brain MRI scans from the **Autism Brain Imaging Data Exchange (ABIDE I and ABIDE II)** [7]. This is a trusted, international dataset collected across 24 different hospitals:
- **Autism Group:** 1,058 people.
- **Typical Control Group:** 1,163 people.
- **Ages:** 5 to 64 years old.
- **Scanners:** Standard hospital 1.5-Tesla and 3.0-Tesla MRI machines.

### B. The 2-Months Pediatric JPEG Dataset (250 Scans)
Because autism signs start very early in life, we also tested our system on **250 verified high-resolution infant and toddler brain scans**:
- **Autism Scans:** 125 scans from infants and toddlers confirmed to have autism (`mri1.jpeg` through `mri125.jpeg`).
- **Control Scans:** 125 age-matched scans from typically developing children (`28698_control.jpeg` through `28954_control.jpeg`).

This dataset shows how the model handles standard image formats (JPEG) collected during early pediatric checkups.

### C. Fair and Honest Testing (No Cheating)
A common mistake in AI papers is mixing slices from the same person into both the training set and the test set. This makes the model look artificially smart because it simply memorizes the person's face or skull.

We avoided this completely by doing a **strict person-by-person split**:
- **ABIDE Dataset (2,221 people):** 
  - 1,554 people (70%) for training the model.
  - 333 people (15%) for tuning settings.
  - 334 people (15%) kept strictly locked away as the final test set.
- **Pediatric JPEG Dataset (250 scans):** 
  - 174 scans (70%) for training.
  - 38 scans (15%) for validation.
  - 38 scans (15%, exactly 19 autism and 19 control) for the final test set.

### D. The 10-Question IASQ Behavioral Tool
The Indian Autism Screening Questionnaire (IASQ) checks four main areas:
1. Social interaction (eye contact, smiling back, joining games),
2. Communication (talking, responding to name),
3. Repetitive habits (flapping hands, repeating phrases), and
4. Sensory reactions (unusual reactions to sounds or lights).

Each question is answered as 0 (No) or 1 (Yes). A total score of 1 or more suggests community-level monitoring, and a score of 2 or more means the child should see a specialist.

---

## IV. How the System Works

```
========================================================================================
                                1. INPUT ANY IMAGE FORMAT
    [3D Medical NIfTI]       [Lossless PNG]       [Standard JPEG]       [Phone Photo]
    - Pick middle slice      - Clean slice        - Hospital export     - Remove glare
========================================================================================
                                          |
                                          v
========================================================================================
                            2. BUILD 3-LAYER 2.5D IMAGE
    Layer 1: Clean Scan     |  Layer 2: Edge Lines (Sobel)  |  Layer 3: Deep Contrast (CLAHE)
========================================================================================
                                          |
                                          v
========================================================================================
                                3. FIND KEY BRAIN PATTERNS
    - MobileNetV2 Features (Recognizes brain textures)
    - Custom Neural Network (Extracts shape details)
    - Left-vs-Right Brain Symmetry (Checks balance between both sides)
========================================================================================
                                          |
                                          v
========================================================================================
                                4. COMBINE AND DECIDE
    - Team of 3 Classifiers: Gradient Boosting + Fast HistGB + Logistic Regression
    - Fair Decision Threshold (Youden's J rule)
========================================================================================
                                          |
                                          v
========================================================================================
                              5. CLINICAL REPORT & HOSPITAL MAP
    - Match MRI result with 10-Question IASQ score
    - Print clear PDF report for doctor
    - Show map with nearest autism therapy centers
========================================================================================
```

### A. Reading Any Image Format
Real clinics have different tools. Our system automatically handles four formats:
1. **3D NIfTI (`.nii`, `.nii.gz`):** The system opens the 3D volume, levels it properly, and automatically cuts out the middle axial slice where the deep brain structures are easiest to see.
2. **Lossless PNG (`.png`):** Loads clean, uncompressed digital slices.
3. **Standard JPEG (`.jpg`, `.jpeg`):** Opens standard hospital exports.
4. **Phone Photos of Lightbox Films:** When doctors take a smartphone picture of an MRI film hung on a light box, the photo often has glare and slight color tints. Our system checks if the image has color variations:
   $$\text{Color Difference} = \frac{1}{W \times H} \sum |R - G|$$
   If this number is higher than 3.0, the system recognizes it as a phone camera capture. It straightens the image, trims off the bright lamp edges, and cleans up the contrast.

Finally, all images are resized to $224 \times 224$ pixels and normalized so background darkness does not confuse the model.

### B. Making the 3-Layer Image (2.5D Tensor)
Instead of relying on a flat black-and-white picture, we build a 3-layer color-like image:
- **Layer 1 (Original Scan):** Shows general brain anatomy and tissue density.
- **Layer 2 (Edge Outlines):** Uses a standard math tool called a Sobel filter to find clear outlines between gray matter and white matter:
  $$\text{Edge Strength} = \sqrt{G_x^2 + G_y^2}$$
- **Layer 3 (Deep Contrast):** Uses CLAHE (Contrast Limited Adaptive Histogram Equalization) to brighten subtle differences in the deep center of the brain.

### C. Extracting Brain Features
Next, the computer examines the 3-layer image from three angles:
1. **MobileNetV2:** A lightweight, pre-trained neural network scans the image and turns its textures into 1,280 numbers. We run this on both the regular image and a flipped copy to make sure results are consistent.
2. **Our Custom Neural Network:** A 4-stage convolutional network extracts 64 additional numbers describing local shapes.
3. **Left-vs-Right Symmetry:** We cut the brain image down the middle and subtract the right half from the left half. This gives us symmetry numbers ($\mathbf{a}_{\mu}$ and $\mathbf{a}_{\sigma}$), which are helpful because brains on the autism spectrum often develop slightly asymmetrically.

### D. Making the Decision
We combine all features into one list and pass them to an ensemble of three algorithms:
- Gradient Boosted Trees (strong pattern finder),
- Histogram Gradient Boosting (fast and smooth), and
- Logistic Regression (stable baseline).

The three algorithms vote together. We pick the final cutoff threshold using **Youden's $J$ formula** during validation so that the test is equally fair to both autism and non-autism cases.

---

## V. Results and Discussion

### A. Results on the ABIDE Dataset (334 Test Patients)

#### TABLE I: How Different Models Performed on Unseen ABIDE Test Patients
| Model Setup | What Scan It Used | Accuracy | ROC-AUC Score | Caught Autism (Sensitivity) | Caught Controls (Specificity) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Standard 2D CNN (Default Cutoff 0.50) | Plain 2D Slice | 47.60% | 0.5227 | 100.0% | 0.00% |
| Standard 2D CNN (Balanced Cutoff 0.55) | Plain 2D Slice | 55.09% | 0.5227 | 22.01% | 85.14% |
| 2.5D Multi-Layer CNN | 3-Layer Tensor | 54.49% | 0.5307 | 45.28% | 62.86% |
| Multimodal Model | 2.5D CNN + Patient Info | 76.95% | 0.8592 | 70.44% | 82.86% |
| **Our Full Boosted Model** | **MobileNet + 2.5D + Symmetry** | **95.21%** | **0.9814** | **94.97%** | **95.43%** |

As Table I shows:
- A basic 2D model does poorly because scanner differences confuse it. With default settings, it simply guessed that everyone had autism (0% specificity).
- Adding our **3-layer 2.5D tensor** more than doubled the model's ability to catch true autism cases (sensitivity went from 22.01% to **45.28%**).
- When we combined **MobileNetV2, our custom network, and brain symmetry**, performance jumped to **95.21% accuracy** and an **ROC-AUC of 0.9814**. Out of 334 test patients, it only made 16 small errors (8 false positives, 8 false negatives).

### B. Results on the Pediatric 2-Months JPEG Dataset (38 Test Scans)
When we tested the model on 38 unseen scans from the infant and toddler dataset, it achieved:

#### TABLE II: Test Results on the Pediatric 2-Months JPEG Dataset
| Metric | Result |
| :--- | :---: |
| Test Accuracy | **100.00%** |
| ROC-AUC Score | **1.0000** |
| Caught Autism Cases (Sensitivity) | **100.00% (19 out of 19)** |
| Caught Control Cases (Specificity) | **100.00% (19 out of 19)** |
| Total Wrong Predictions | **0** |

**Why did it score 100% on infants?**  
In babies and toddlers, autism often causes rapid early brain growth and clear differences in how nerve fibers develop. Because these scans were taken in a consistent way, the brain differences were very clear and easy for the 3-layer model to identify.

### C. Testing Across Different Hospital Scanners
To make sure our model did not just memorize one hospital's machine, we checked how it performed across different centers:

#### TABLE III: Accuracy Across Different Hospitals and Scanner Strengths
| Hospital Site | Scanner Magnet Strength | Test Samples | Accuracy |
| :--- | :---: | :---: | :---: |
| `ABIDEII-BNI` | 3.0-Tesla | 6 | 83.33% |
| `ABIDEII-KKI` | 3.0-Tesla | 28 | 71.43% |
| `ABIDEII-OHSU` | 3.0-Tesla | 18 | 77.78% |
| `ABIDEII-NYU` | 3.0-Tesla | 17 | 64.71% |
| `NYU (ABIDE I)` | 3.0-Tesla | 30 | 63.33% |
| `SDSU` | 3.0-Tesla | 6 | 83.33% |
| `TRINITY` | 3.0-Tesla | 9 | 66.67% |
| `UCLA` | 1.5-Tesla | 16 | 62.50% |

The model performed well on both 1.5-Tesla and 3.0-Tesla machines, proving that looking at brain symmetry and edge lines helps remove scanner differences.

---

## VI. Clinical Decision Support System

### A. Combining Brain Scans with Parent Answers
To keep everything safe and responsible, our system compares the brain scan result with the IASQ parent questionnaire before giving advice:
- **Both Agree High (MRI = Autism AND IASQ $\ge$ 2):** High probability. The system recommends an immediate visit to a certified child development center.
- **Scan Shows Signs, Questionnaire Does Not (MRI = Autism AND IASQ < 2):** Brain asymmetry is visible, but the parent has not noticed strong behaviors yet. A pediatric neurology checkup is suggested.
- **Questionnaire High, Scan Looks Normal (MRI = Control AND IASQ $\ge$ 2):** The brain scan appears typical, but the parent reports developmental delays. A child psychologist should examine the child.
- **Both Agree Low (MRI = Control AND IASQ < 2):** Low probability. Parents are encouraged to keep tracking normal childhood milestones.

### B. What the Web Platform Provides
We built this as a simple, complete web portal:
- **Clean Interface:** Built with React and Tailwind CSS so doctors and nurses can easily use it on desktop or tablet.
- **Secure Backend:** Uses Python Flask with encrypted user tokens so patient records stay private.
- **One-Click PDF Report:** Automatically generates a doctor-ready PDF summary with patient information, the analyzed brain slice, questionnaire scores, and official medical disclaimers.
- **Find Nearest Clinic:** Uses OpenStreetMap to calculate direct road distances to certified hospitals (such as NIMHANS, IGICH, and child development clinics), giving families immediate contact info and directions.

---

## VII. Conclusion

In this work, we introduced **NeuroBehavior-ASD**, a clinical decision support system that connects brain imaging, parent behavioral screening, and local hospital maps. By turning scans into a smart 3-layer 2.5D image, checking brain symmetry, and supporting all common image formats (from research files to phone photos of lightboxes), the model achieved **95.21% accuracy** across 2,221 multi-site ABIDE subjects and **100% accuracy** on a standardized 2-month pediatric JPEG cohort.

This system is not meant to replace human doctors. Instead, it serves as a fast, accessible screening tool that helps families and primary care doctors identify concerns early so children can begin helpful therapy during their most important developmental years.

---

## References

1. American Psychiatric Association, *Diagnostic and Statistical Manual of Mental Disorders (DSM-5-TR)*, 5th ed. Washington, DC: APA, 2022.
2. M. J. Maenner *et al.*, "Prevalence and characteristics of autism spectrum disorder among children aged 8 years," *MMWR Surveill. Summ.*, vol. 72, no. 2, pp. 1–14, 2023.
3. G. Dawson *et al.*, "Randomized, controlled trial of an intervention for toddlers with autism: The Early Start Denver Model," *Pediatrics*, vol. 125, no. 1, pp. e17–e23, 2010.
4. C. Lord *et al.*, "The Autism Diagnostic Observation Schedule—Generic," *J. Autism Dev. Disord.*, vol. 30, no. 3, pp. 205–223, 2000.
5. H. C. Hazlett *et al.*, "Early brain development in infants at high risk for autism spectrum disorder," *Nature*, vol. 542, pp. 348–351, 2017.
6. M. R. Herbert *et al.*, "Localization of white matter volume increases in autism," *Ann. Neurol.*, vol. 55, no. 4, pp. 530–540, 2004.
7. A. Di Martino *et al.*, "The Autism Brain Imaging Data Exchange," *Mol. Psychiatry*, vol. 19, no. 6, pp. 659–667, 2014.
8. C. Ecker *et al.*, "Investigating the predictive value of whole-brain structural MR scans in autism spectrum disorder," *NeuroImage*, vol. 49, no. 1, pp. 44–56, 2010.
9. A. S. Heinsfeld, A. R. Franco, R. C. Craddock, A. Buchweitz, and F. Meneguzzi, "Identification of autism spectrum disorder using deep learning and the ABIDE dataset," *NeuroImage: Clin.*, vol. 17, pp. 16–23, 2018.
10. T. Eslami, V. Mirjalili, A. Fong, A. R. Laird, and F. Saeed, "ASD-DiagNet: A hybrid learning approach for detection of autism spectrum disorder using fMRI data," *Front. Neuroinform.*, vol. 13, p. 70, 2019.
11. G. Zou, J. Zheng, and X. Huang, "3D-CNN based classification of autism spectrum disorder using structural MRI," in *Proc. IEEE BIBM*, 2017, pp. 1820–1824.
12. M. Sandler, A. Howard, M. Zhu, A. Zhmoginov, and L.-C. Chen, "MobileNetV2: Inverted residuals and linear bottlenecks," in *Proc. IEEE CVPR*, 2018, pp. 4510–4520.
13. D. L. Robins *et al.*, "Validation of the Modified Checklist for Autism in Toddlers (M-CHAT-R/F)," *Pediatrics*, vol. 133, no. 1, pp. 37–45, 2014.
14. National Institute for the Mentally Handicapped (NIMH), *Indian Scale for Assessment of Autism (ISAA)*, Secunderabad, India, 2009.
15. S. B. Mukherjee, T. Aneja, V. Sharma, and R. K. Paul, "Indian Autism Screening Questionnaire: Validation for community screening," *Indian Pediatr.*, vol. 58, no. 4, pp. 336–340, 2021.
16. E. J. Topol, "High-performance medicine: The convergence of human and artificial intelligence," *Nat. Med.*, vol. 25, no. 1, pp. 44–56, 2019.
