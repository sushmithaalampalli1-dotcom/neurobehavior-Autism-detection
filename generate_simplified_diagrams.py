import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

def create_simplified_diagrams():
    out_dir = r"C:\Users\ankit\.gemini\antigravity\scratch\neurobehavior-asd"
    artifact_dir = r"C:\Users\ankit\.gemini\antigravity\brain\bf3cd664-b17e-4d33-a4db-1b71cc86cad5"
    
    # -------------------------------------------------------------
    # DIAGRAM 1: Simple 4-Step End-to-End Pipeline
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(14, 4.2), dpi=300)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 4.2)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    
    # Colors
    c_blue_bg = "#EFF6FF"
    c_blue_bdr = "#2563EB"
    c_teal_bg = "#F0FDFA"
    c_teal_bdr = "#0D9488"
    c_purple_bg = "#FAF5FF"
    c_purple_bdr = "#7C3AED"
    c_green_bg = "#F0FDF4"
    c_green_bdr = "#16A34A"
    c_dark = "#1E293B"
    c_muted = "#475569"
    
    def draw_step(x, y, w, h, bg, bdr, step_num, title, items):
        # Card shadow
        shadow = patches.FancyBboxPatch((x+0.03, y-0.03), w, h, boxstyle="round,pad=0.08,rounding_size=0.12",
                                        facecolor="#E2E8F0", edgecolor="none", zorder=1)
        ax.add_patch(shadow)
        # Card body
        card = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.12",
                                      facecolor=bg, edgecolor=bdr, linewidth=1.6, zorder=2)
        ax.add_patch(card)
        # Header Badge
        badge = patches.FancyBboxPatch((x+0.12, y+h-0.22), 0.9, 0.28, boxstyle="round,pad=0.02,rounding_size=0.06",
                                       facecolor=bdr, edgecolor="none", zorder=3)
        ax.add_patch(badge)
        ax.text(x+0.57, y+h-0.08, f"STEP {step_num}", ha='center', va='center',
                fontsize=8, fontweight='bold', color='#FFFFFF', zorder=4)
        # Title
        ax.text(x + w/2, y + h - 0.50, title, ha='center', va='center',
                fontsize=10.5, fontweight='bold', color=c_dark, zorder=4)
        # Separator line
        ax.plot([x+0.2, x+w-0.2], [y+h-0.72, y+h-0.72], color=bdr, alpha=0.3, linewidth=1, zorder=3)
        # Items
        curr_y = y + h - 1.02
        for itm in items:
            ax.text(x + 0.2, curr_y, itm, ha='left', va='center', fontsize=8.5, color=c_muted, zorder=4)
            curr_y -= 0.34
            
    # Draw 4 Steps
    w = 2.85
    h = 3.2
    y_pos = 0.5
    
    # Step 1
    draw_step(0.4, y_pos, w, h, c_blue_bg, c_blue_bdr, 1, "Universal Ingestion", [
        "• Any Scan Format:",
        "  - 3D NIfTI (.nii)",
        "  - 2D Lossless (.png)",
        "  - Clinical JPG / JPEG",
        "  - Mobile Lightbox Photo",
        "• Auto-extract mid-brain slice",
        "• Glare & tilt auto-correction"
    ])
    
    # Step 2
    draw_step(3.8, y_pos, w, h, c_teal_bg, c_teal_bdr, 2, "2.5D Tensor Fusion", [
        "• 3-Channel Smart Synthesis:",
        "  - Ch 1: Raw Tissue Anatomy",
        "  - Ch 2: Sobel Edge Details",
        "  - Ch 3: CLAHE Deep Contrast",
        "• Standard Size: 224 x 224 x 3",
        "• High spatial accuracy",
        "• Fast, zero 3D lag"
    ])
    
    # Step 3
    draw_step(7.2, y_pos, w, h, c_purple_bg, c_purple_bdr, 3, "AI Feature Ensemble", [
        "• MobileNetV2 Deep Textures",
        "• Left-vs-Right Brain Symmetry",
        "• Soft-Voting Ensemble:",
        "  - Gradient Boosted Trees",
        "  - Histogram Boosting",
        "  - Calibrated Logistic Reg",
        "• 95.2% Multi-Site Accuracy"
    ])
    
    # Step 4
    draw_step(10.6, y_pos, w, h, c_green_bg, c_green_bdr, 4, "Clinical Care Output", [
        "• Autism Probability Score",
        "• IASQ 10-Q Parent Fusion",
        "• Automated Doctor PDF:",
        "  - Scan slice + Disclaimers",
        "  - Verified under RPwD Act",
        "• OpenStreetMap Routing:",
        "  - Nearest certified hospital"
    ])
    
    # Connecting Arrows
    def draw_arrow(x_start, x_end):
        ax.annotate('', xy=(x_end, y_pos + h/2), xytext=(x_start, y_pos + h/2),
                    arrowprops=dict(arrowstyle="-|>", color="#94A3B8", lw=2.2, mutation_scale=18))
        
    draw_arrow(0.4 + w + 0.05, 3.8 - 0.05)
    draw_arrow(3.8 + w + 0.05, 7.2 - 0.05)
    draw_arrow(7.2 + w + 0.05, 10.6 - 0.05)
    
    # Save Diagram 1
    d1_png = os.path.join(out_dir, "diagram1_simplified_pipeline.png")
    d1_pdf = os.path.join(out_dir, "diagram1_simplified_pipeline.pdf")
    d1_art = os.path.join(artifact_dir, "diagram1_simplified_pipeline.png")
    plt.tight_layout()
    plt.savefig(d1_png, dpi=300, bbox_inches='tight')
    plt.savefig(d1_pdf, bbox_inches='tight')
    plt.savefig(d1_art, dpi=300, bbox_inches='tight')
    plt.close()
    print("Diagram 1 created successfully!")

    # -------------------------------------------------------------
    # DIAGRAM 2: 2.5D Tensor Synthesis Explanation
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(12, 4.8), dpi=300)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 4.8)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    
    # Left: Input Grayscale
    card_in = patches.FancyBboxPatch((0.5, 1.4), 2.2, 2.0, boxstyle="round,pad=0.08,rounding_size=0.12",
                                    facecolor="#F1F5F9", edgecolor="#64748B", linewidth=1.6)
    ax.add_patch(card_in)
    ax.text(1.6, 2.7, "Input 2D Slice", ha='center', va='center', fontsize=10.5, fontweight='bold', color=c_dark)
    ax.text(1.6, 2.3, "Raw Grayscale MRI", ha='center', va='center', fontsize=8.5, color=c_muted)
    ax.text(1.6, 1.8, "224 x 224 x 1", ha='center', va='center', fontsize=9, fontweight='bold', color="#0F172A")
    
    # Middle 3 Channels
    ch_y = [3.2, 1.9, 0.6]
    ch_titles = [
        ("Channel 1: Raw Intensity (Red)", "Brain tissue volume & ventricles", "#EF4444", "#FEF2F2"),
        ("Channel 2: Sobel Gradient (Green)", "Gray/white matter edge boundaries", "#10B981", "#ECFDF5"),
        ("Channel 3: CLAHE Contrast (Blue)", "Enhanced deep subcortical nuclei", "#3B82F6", "#EFF6FF")
    ]
    
    for i, (t, sub, bdr, bg) in enumerate(ch_titles):
        c_box = patches.FancyBboxPatch((4.2, ch_y[i]), 3.8, 0.95, boxstyle="round,pad=0.06,rounding_size=0.1",
                                       facecolor=bg, edgecolor=bdr, linewidth=1.4)
        ax.add_patch(c_box)
        ax.text(4.4, ch_y[i] + 0.62, t, ha='left', va='center', fontsize=9, fontweight='bold', color=bdr)
        ax.text(4.4, ch_y[i] + 0.28, sub, ha='left', va='center', fontsize=8, color=c_muted)
        
        # Connect input to channel
        ax.annotate('', xy=(4.15, ch_y[i] + 0.47), xytext=(2.75, 2.4),
                    arrowprops=dict(arrowstyle="-|>", color="#94A3B8", lw=1.5, mutation_scale=14))
        
        # Connect channel to final tensor
        ax.annotate('', xy=(9.25, 2.4), xytext=(8.05, ch_y[i] + 0.47),
                    arrowprops=dict(arrowstyle="-|>", color="#94A3B8", lw=1.5, mutation_scale=14))
        
    # Right: Combined 2.5D Tensor
    card_out = patches.FancyBboxPatch((9.3, 1.3), 2.3, 2.2, boxstyle="round,pad=0.08,rounding_size=0.12",
                                     facecolor="#FAF5FF", edgecolor="#7C3AED", linewidth=1.8)
    ax.add_patch(card_out)
    ax.text(10.45, 2.8, "Synthesized", ha='center', va='center', fontsize=10.5, fontweight='bold', color=c_dark)
    ax.text(10.45, 2.5, "2.5D Brain Tensor", ha='center', va='center', fontsize=10.5, fontweight='bold', color="#7C3AED")
    ax.text(10.45, 2.05, "224 x 224 x 3", ha='center', va='center', fontsize=9.5, fontweight='bold', color="#0F172A")
    ax.text(10.45, 1.65, "Enables deep CNNs\nto see 3D-like textures", ha='center', va='center', fontsize=8, color=c_muted)
    
    # Save Diagram 2
    d2_png = os.path.join(out_dir, "diagram2_25d_tensor_synthesis.png")
    d2_pdf = os.path.join(out_dir, "diagram2_25d_tensor_synthesis.pdf")
    d2_art = os.path.join(artifact_dir, "diagram2_25d_tensor_synthesis.png")
    plt.tight_layout()
    plt.savefig(d2_png, dpi=300, bbox_inches='tight')
    plt.savefig(d2_pdf, bbox_inches='tight')
    plt.savefig(d2_art, dpi=300, bbox_inches='tight')
    plt.close()
    print("Diagram 2 created successfully!")

    # -------------------------------------------------------------
    # DIAGRAM 3: Simple Clinical Decision Flow (Brain + Questionnaire)
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(11, 4.4), dpi=300)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 4.4)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    
    # Left Input Nodes
    box_mri = patches.FancyBboxPatch((0.5, 2.6), 2.4, 1.1, boxstyle="round,pad=0.06,rounding_size=0.1",
                                    facecolor="#EFF6FF", edgecolor="#2563EB", linewidth=1.5)
    ax.add_patch(box_mri)
    ax.text(1.7, 3.3, "Brain MRI AI Result", ha='center', va='center', fontsize=9.5, fontweight='bold', color="#1E3A8A")
    ax.text(1.7, 2.9, "Autism Likelihood (P ≥ 0.50)", ha='center', va='center', fontsize=8, color=c_muted)
    
    box_q = patches.FancyBboxPatch((0.5, 0.7), 2.4, 1.1, boxstyle="round,pad=0.06,rounding_size=0.1",
                                  facecolor="#F0FDF4", edgecolor="#16A34A", linewidth=1.5)
    ax.add_patch(box_q)
    ax.text(1.7, 1.4, "IASQ 10-Q Score", ha='center', va='center', fontsize=9.5, fontweight='bold', color="#14532D")
    ax.text(1.7, 1.0, "Caregiver Behavior (S ≥ 2)", ha='center', va='center', fontsize=8, color=c_muted)
    
    # Decision Synthesizer
    box_core = patches.FancyBboxPatch((3.7, 1.6), 2.4, 1.3, boxstyle="round,pad=0.06,rounding_size=0.1",
                                     facecolor="#FFFBEB", edgecolor="#D97706", linewidth=1.6)
    ax.add_patch(box_core)
    ax.text(4.9, 2.45, "Dual Concordance", ha='center', va='center', fontsize=10, fontweight='bold', color="#78350F")
    ax.text(4.9, 2.15, "Decision Engine", ha='center', va='center', fontsize=9.5, fontweight='bold', color="#B45309")
    ax.text(4.9, 1.85, "Cross-checks Brain + Behavior", ha='center', va='center', fontsize=7.5, color=c_muted)
    
    ax.annotate('', xy=(3.65, 2.3), xytext=(2.95, 3.1),
                arrowprops=dict(arrowstyle="-|>", color="#94A3B8", lw=1.6, mutation_scale=14))
    ax.annotate('', xy=(3.65, 2.1), xytext=(2.95, 1.3),
                arrowprops=dict(arrowstyle="-|>", color="#94A3B8", lw=1.6, mutation_scale=14))
    
    # 4 Output Clinical Pathways
    out_y = [3.4, 2.4, 1.4, 0.4]
    out_paths = [
        ("High Priority Urgent Referral", "MRI Positive + IASQ Score ≥ 2 (Tertiary Center)", "#DC2626", "#FEF2F2"),
        ("Neurology Clinical Correlation", "MRI Positive + IASQ Score < 2 (Check Asymmetry)", "#EA580C", "#FFF7ED"),
        ("Developmental Psychology Review", "MRI Typical + IASQ Score ≥ 2 (Behavior Focus)", "#D97706", "#FFFBEB"),
        ("Typical Development Follow-up", "MRI Typical + IASQ Score < 2 (Routine Milestones)", "#16A34A", "#F0FDF4")
    ]
    
    for i, (title, desc, bdr, bg) in enumerate(out_paths):
        box_out = patches.FancyBboxPatch((6.9, out_y[i]), 3.8, 0.78, boxstyle="round,pad=0.04,rounding_size=0.08",
                                         facecolor=bg, edgecolor=bdr, linewidth=1.3)
        ax.add_patch(box_out)
        ax.text(7.1, out_y[i] + 0.52, title, ha='left', va='center', fontsize=8.5, fontweight='bold', color=bdr)
        ax.text(7.1, out_y[i] + 0.22, desc, ha='left', va='center', fontsize=7.5, color=c_muted)
        
        ax.annotate('', xy=(6.85, out_y[i] + 0.39), xytext=(6.15, 2.25),
                    arrowprops=dict(arrowstyle="-|>", color="#94A3B8", lw=1.4, mutation_scale=12))
        
    # Save Diagram 3
    d3_png = os.path.join(out_dir, "diagram3_clinical_decision_flow.png")
    d3_pdf = os.path.join(out_dir, "diagram3_clinical_decision_flow.pdf")
    d3_art = os.path.join(artifact_dir, "diagram3_clinical_decision_flow.png")
    plt.tight_layout()
    plt.savefig(d3_png, dpi=300, bbox_inches='tight')
    plt.savefig(d3_pdf, bbox_inches='tight')
    plt.savefig(d3_art, dpi=300, bbox_inches='tight')
    plt.close()
    print("Diagram 3 created successfully!")

if __name__ == '__main__':
    create_simplified_diagrams()
