import matplotlib.pyplot as plt
import matplotlib.patches as patches

def create_architecture_diagram(output_png, output_pdf=None):
    # Set up figure with standard 16:9 ratio and high DPI for IEEE print
    fig, ax = plt.subplots(figsize=(15, 7.5), dpi=300)
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 7.5)
    ax.axis('off')

    # Color palette
    c_bg_main = "#F8FAFC"
    c_border = "#CBD5E1"
    c_blue_bg = "#EFF6FF"
    c_blue_bdr = "#3B82F6"
    c_teal_bg = "#F0FDFA"
    c_teal_bdr = "#0D9488"
    c_amber_bg = "#FFFBEB"
    c_amber_bdr = "#D97706"
    c_purple_bg = "#FAF5FF"
    c_purple_bdr = "#8B5CF6"
    c_dark = "#0F172A"
    c_muted = "#475569"

    # Background canvas
    fig.patch.set_facecolor('#FFFFFF')

    # Helper function to draw rounded cards
    def draw_card(x, y, w, h, bg, border, title, items, badge=""):
        # Shadow
        shadow = patches.FancyBboxPatch((x+0.04, y-0.04), w, h, boxstyle="round,pad=0.1,rounding_size=0.15",
                                        facecolor="#E2E8F0", edgecolor="none", zorder=1)
        ax.add_patch(shadow)
        # Main box
        box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1,rounding_size=0.15",
                                     facecolor=bg, edgecolor=border, linewidth=1.8, zorder=2)
        ax.add_patch(box)
        
        # Badge
        if badge:
            badge_box = patches.FancyBboxPatch((x+0.15, y+h-0.25), len(badge)*0.16 + 0.3, 0.35,
                                               boxstyle="round,pad=0.04,rounding_size=0.08",
                                               facecolor=border, edgecolor="none", zorder=3)
            ax.add_patch(badge_box)
            ax.text(x+0.15 + (len(badge)*0.16+0.3)/2, y+h-0.08, badge, ha='center', va='center',
                    fontsize=8.5, fontweight='bold', color='#FFFFFF', zorder=4)

        # Title
        title_y = y + h - 0.55 if badge else y + h - 0.35
        ax.text(x + w/2, title_y, title, ha='center', va='center', fontsize=11, fontweight='bold',
                color=c_dark, zorder=3)

        # Content lines
        start_y = title_y - 0.4
        for i, itm in enumerate(items):
            ax.text(x + 0.2, start_y - (i * 0.36), itm, ha='left', va='center',
                    fontsize=9, color=c_muted, zorder=3)

    # 1. Supported Formats Box (Left column)
    draw_card(
        x=0.5, y=4.4, w=3.0, h=2.5,
        bg=c_blue_bg, border=c_blue_bdr,
        badge="INPUT FORMATS",
        title="Universal Ingestion",
        items=[
            "• 3D NIfTI (.nii, .nii.gz)",
            "• Lossless Slice (.png)",
            "• Clinical JPEG (.jpg, .jpeg)",
            "• Smartphone Photo (Lightbox)",
            "→ Auto-glare & tilt correction"
        ]
    )

    # 2. 2.5D Tensor Synthesis Box
    draw_card(
        x=4.1, y=4.4, w=3.2, h=2.5,
        bg=c_teal_bg, border=c_teal_bdr,
        badge="IMAGE ENHANCEMENT",
        title="2.5D Spatial Tensor",
        items=[
            "• Ch 1: Raw Density (Anatomy)",
            "• Ch 2: Sobel Edge Gradients",
            "• Ch 3: CLAHE Deep Contrast",
            "• Size: 224 x 224 x 3",
            "→ Rich details without 3D lag"
        ]
    )

    # 3. Multi-Scale Feature Extraction Box
    draw_card(
        x=7.9, y=4.4, w=3.2, h=2.5,
        bg=c_purple_bg, border=c_purple_bdr,
        badge="FEATURE EXTRACTION",
        title="Multi-Scale Patterns",
        items=[
            "• MobileNetV2 Textures (1,280)",
            "• Custom 4-Stage CNN (64)",
            "• Left-vs-Right Brain Symmetry",
            "• Direct + Flipped Averaging",
            "→ Total: 1,350 Scaled Features"
        ]
    )

    # 4. Voting Classifier Box
    draw_card(
        x=11.7, y=4.4, w=2.8, h=2.5,
        bg=c_amber_bg, border=c_amber_bdr,
        badge="AI ENSEMBLE",
        title="Fair Decision Engine",
        items=[
            "• Gradient Boosted Trees (w=3)",
            "• HistGradientBoosting (w=3)",
            "• Logistic Regression (w=2)",
            "• Youden's J Thresholding",
            "→ 95.21% Test Accuracy"
        ]
    )

    # Horizontal connection arrows between top row
    arrow_props = dict(arrowstyle="-|>,head_width=0.35,head_length=0.45", lw=2.2, color="#64748B")
    ax.annotate("", xy=(4.0, 5.65), xytext=(3.6, 5.65), arrowprops=arrow_props)
    ax.annotate("", xy=(7.8, 5.65), xytext=(7.4, 5.65), arrowprops=arrow_props)
    ax.annotate("", xy=(11.6, 5.65), xytext=(11.2, 5.65), arrowprops=arrow_props)

    # Connecting curve from top-right down to Stage 5
    con_arrow = patches.FancyArrowPatch((13.1, 4.3), (13.1, 3.4), connectionstyle="arc3,rad=0",
                                        arrowstyle="-|>,head_width=0.35,head_length=0.45",
                                        lw=2.2, color="#64748B")
    ax.add_patch(con_arrow)

    # 5. Bottom Row: Behavioral Intake & Clinical Action
    draw_card(
        x=0.5, y=0.7, w=4.0, h=2.5,
        bg="#FDF4FF", border="#C026D3",
        badge="BEHAVIORAL INTAKE",
        title="10-Item IASQ Screening",
        items=[
            r"- Caregiver survey (PMC8062015)",
            r"- Social reciprocity & eye contact",
            r"- Speech, repetition, sensory",
            r"- Cutoff 1 (Score >= 1): Community triage",
            r"- Cutoff 2 (Score >= 2): Clinical referral"
        ]
    )

    draw_card(
        x=5.2, y=0.7, w=4.5, h=2.5,
        bg="#F0FDF4", border="#16A34A",
        badge="DECISION SYNTHESIS",
        title="Concordance Matrix",
        items=[
            r"- High: MRI(+) & IASQ >= 2 -> Immediate Center Referral",
            r"- Partial: MRI(+) & IASQ < 2 -> Pediatric Neurology Check",
            r"- Partial: MRI(-) & IASQ >= 2 -> Child Psychology Check",
            r"- Low: MRI(-) & IASQ < 2 -> Routine Tracking",
            r"-> Safe, doctor-guided decisions (No overreach)"
        ]
    )

    draw_card(
        x=10.4, y=0.7, w=4.1, h=2.5,
        bg="#EFF6FF", border="#2563EB",
        badge="ACTIONABLE CARE",
        title="Doctor Report & Clinic Map",
        items=[
            r"- One-Click Doctor PDF Summary",
            r"- RPwD Act 2016 Medical Disclaimers",
            r"- OpenStreetMap Proximity Routing",
            r"- Haversine Geodesic Driving Distance",
            r"-> NIMHANS, IGICH, Spastics Society"
        ]
    )

    # Connecting arrows for bottom row
    ax.annotate("", xy=(5.1, 1.95), xytext=(4.6, 1.95), arrowprops=arrow_props)
    ax.annotate("", xy=(10.3, 1.95), xytext=(9.8, 1.95), arrowprops=arrow_props)
    
    # Connection between top ensemble and bottom concordance
    down_arrow = patches.FancyArrowPatch((12.5, 3.4), (7.5, 3.3), connectionstyle="arc3,rad=-0.15",
                                        arrowstyle="-|>,head_width=0.35,head_length=0.45",
                                        lw=2.2, color="#64748B", linestyle="--")
    ax.add_patch(down_arrow)
    ax.text(10.2, 3.75, "MRI Prediction + IASQ Score", ha='center', va='center',
            fontsize=8.5, fontweight='bold', color="#475569",
            bbox=dict(boxstyle="round,pad=0.2", facecolor="#F1F5F9", edgecolor="none"))

    # Overall title & subtitle banner
    plt.tight_layout()
    plt.savefig(output_png, bbox_inches='tight', dpi=300)
    if output_pdf:
        plt.savefig(output_pdf, bbox_inches='tight')
    plt.close()
    print(f"Generated {output_png}")

if __name__ == "__main__":
    import os
    from pathlib import Path
    out_dir = Path(r"C:\Users\ankit\.gemini\antigravity\scratch\neurobehavior-asd")
    create_architecture_diagram(out_dir / "pipeline_architecture.png", out_dir / "pipeline_architecture.pdf")
