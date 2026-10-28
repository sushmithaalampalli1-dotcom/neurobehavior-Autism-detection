"""Comprehensive Dataset Inspection and Audit Script for NeuroBehavior-ASD (2D MRI).

Adheres to:
- No file modifications or deletions of source data.
- Purely read-only inspection.
- Full verification of participant mapping, DX_GROUP labels, duplicates, and slice properties.
"""
import os
import sys
import hashlib
from pathlib import Path
import json
import numpy as np
import pandas as pd
from PIL import Image

# Source Dataset Locations
ASD_PROJECT_DIR = Path(r"C:\Users\ankit\Downloads\ASD_MRI_Project")
IMAGES_DIR = ASD_PROJECT_DIR / "data" / "MRI ASD IMAGES"
ABIDE1_CSV_PATH = ASD_PROJECT_DIR / "data" / "Phenotypic_V1_0b_preprocessed1.csv"
ABIDE2_CSV_PATH = ASD_PROJECT_DIR / "data" / "ABIDEII_Composite_Phenotypic (1).csv"
EXCEL_PATH = ASD_PROJECT_DIR / "data" / "BEHAVIORAL DATA_finalllllll.xlsx"

# Project Output Directory
PROJECT_ROOT = Path(r"C:\Users\ankit\.gemini\antigravity\scratch\neurobehavior-asd")
MANIFEST_OUTPUT = PROJECT_ROOT / "data_config" / "mri_2d_manifest.csv"
AUDIT_JSON_OUTPUT = PROJECT_ROOT / "data_config" / "mri_2d_audit_summary.json"


def compute_file_hash(path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def inspect_all():
    print("=" * 70)
    print("STEP 1: INSPECTING DATASET FILES & PHENOTYPIC METADATA")
    print("=" * 70)

    # 1. Load Phenotypic Data
    print("\n[+] Loading ABIDE I phenotypic CSV...")
    df_abide1 = pd.read_csv(ABIDE1_CSV_PATH)
    df_abide1["SUB_ID_STR"] = df_abide1["SUB_ID"].astype(str).str.strip()
    df_abide1_lookup = df_abide1.set_index("SUB_ID_STR")

    print("[+] Loading ABIDE II phenotypic CSV...")
    df_abide2 = pd.read_csv(ABIDE2_CSV_PATH, encoding="cp1252", low_memory=False)
    df_abide2["SUB_ID_STR"] = df_abide2["SUB_ID"].astype(str).str.strip()
    df_abide2_lookup = df_abide2.set_index("SUB_ID_STR")

    print(f"    ABIDE I total records: {len(df_abide1)}")
    print(f"    ABIDE II total records: {len(df_abide2)}")

    # 2. Inspect Image Files
    print(f"\n[+] Scanning 2D PNG images in: {IMAGES_DIR}")
    autistic_dir = IMAGES_DIR / "Autistic"
    non_autistic_dir = IMAGES_DIR / "Non Autistic"

    autistic_files = sorted(list(autistic_dir.glob("*.png")))
    non_autistic_files = sorted(list(non_autistic_dir.glob("*.png")))

    print(f"    Autistic folder count: {len(autistic_files)} PNGs")
    print(f"    Non Autistic folder count: {len(non_autistic_files)} PNGs")
    print(f"    Total PNG files found: {len(autistic_files) + len(non_autistic_files)}")

    all_files = [(f, "Autistic", 1) for f in autistic_files] + [(f, "Non Autistic", 2) for f in non_autistic_files]

    manifest_rows = []
    hash_to_files = {}
    corrupted_count = 0
    missing_metadata_count = 0
    label_mismatches = []
    dimensions_set = set()
    channels_set = set()
    modes_set = set()

    for file_path, folder_label, expected_dx in all_files:
        filename = file_path.name
        participant_id_str = file_path.stem  # e.g., "50002" from "50002.png"

        # Check file integrity and PIL properties
        is_corrupted = False
        img_w, img_h = None, None
        img_mode = None
        min_p, max_p, mean_p, std_p = None, None, None, None

        try:
            with Image.open(file_path) as img:
                img.verify()
            with Image.open(file_path) as img:
                img_w, img_h = img.size
                img_mode = img.mode
                dimensions_set.add((img_w, img_h))
                modes_set.add(img_mode)
                arr = np.array(img)
                channels = 1 if arr.ndim == 2 else arr.shape[2]
                channels_set.add(channels)
                min_p = float(arr.min())
                max_p = float(arr.max())
                mean_p = float(arr.mean())
                std_p = float(arr.std())
        except Exception as e:
            is_corrupted = True
            corrupted_count += 1
            print(f"    [!] Corrupted image detected: {file_path} - {e}")

        # Compute hash
        sha256 = compute_file_hash(file_path)
        hash_to_files.setdefault(sha256, []).append((file_path, participant_id_str, folder_label))

        # Match to phenotypic metadata
        matched_cohort = None
        matched_site = None
        matched_dx = None
        matched_age = None
        matched_sex = None

        if participant_id_str in df_abide1_lookup.index:
            matched_cohort = "ABIDE I"
            row = df_abide1_lookup.loc[participant_id_str]
            if isinstance(row, pd.DataFrame):
                row = row.iloc[0]
            matched_site = str(row.get("SITE_ID", "UNKNOWN"))
            matched_dx = int(row.get("DX_GROUP", -1))
            matched_age = float(row.get("AGE_AT_SCAN", np.nan))
            matched_sex = int(row.get("SEX", -1))
        elif participant_id_str in df_abide2_lookup.index:
            matched_cohort = "ABIDE II"
            row = df_abide2_lookup.loc[participant_id_str]
            if isinstance(row, pd.DataFrame):
                row = row.iloc[0]
            matched_site = str(row.get("SITE_ID", "UNKNOWN"))
            matched_dx = int(row.get("DX_GROUP", -1))
            matched_age = float(row.get("AGE_AT_SCAN", np.nan))
            matched_sex = int(row.get("SEX", -1))
        else:
            missing_metadata_count += 1

        # Check for label mismatch
        if matched_dx is not None and matched_dx != expected_dx:
            label_mismatches.append({
                "file": filename,
                "folder_label": folder_label,
                "expected_dx": expected_dx,
                "phenotypic_dx": matched_dx,
                "cohort": matched_cohort,
                "site": matched_site,
            })

        manifest_rows.append({
            "filename": filename,
            "relative_path": f"{folder_label}/{filename}",
            "absolute_path": str(file_path),
            "folder_label": folder_label,
            "expected_dx": expected_dx,
            "participant_id": participant_id_str,
            "cohort": matched_cohort,
            "site_id": matched_site,
            "phenotypic_dx": matched_dx,
            "age_at_scan": matched_age,
            "sex": matched_sex,
            "image_width": img_w,
            "image_height": img_h,
            "image_mode": img_mode,
            "min_pixel": min_p,
            "max_pixel": max_p,
            "mean_pixel": mean_p,
            "std_pixel": std_p,
            "is_corrupted": is_corrupted,
            "sha256": sha256,
        })

    df_manifest = pd.DataFrame(manifest_rows)
    df_manifest.to_csv(MANIFEST_OUTPUT, index=False)
    print(f"\n[+] Manifest saved to: {MANIFEST_OUTPUT}")

    # Duplicate check
    duplicate_groups = {k: v for k, v in hash_to_files.items() if len(v) > 1}
    exact_duplicate_files_count = sum(len(v) for v in duplicate_groups.values())

    # Summary Statistics
    total_images = len(df_manifest)
    unique_participants = df_manifest["participant_id"].nunique()
    asd_participants = df_manifest[df_manifest["expected_dx"] == 1]["participant_id"].nunique()
    control_participants = df_manifest[df_manifest["expected_dx"] == 2]["participant_id"].nunique()
    autistic_images = (df_manifest["expected_dx"] == 1).sum()
    control_images = (df_manifest["expected_dx"] == 2).sum()

    cohort_distribution = df_manifest["cohort"].value_counts(dropna=False).to_dict()
    site_distribution = df_manifest["site_id"].value_counts(dropna=False).to_dict()

    print("\n" + "=" * 70)
    print("DATASET AUDIT METRICS SUMMARY")
    print("=" * 70)
    print(f"Total Image Count:               {total_images}")
    print(f"Unique Participant Count:        {unique_participants}")
    print(f"ASD Participants (DX=1):         {asd_participants}")
    print(f"Control Participants (DX=2):     {control_participants}")
    print(f"ASD Images (Autistic folder):    {autistic_images}")
    print(f"Control Images (Non Autistic):   {control_images}")
    print(f"Duplicate Groups:                {len(duplicate_groups)} groups ({exact_duplicate_files_count} files involved)")
    print(f"Corrupted Images:                {corrupted_count}")
    print(f"Missing Metadata Images:         {missing_metadata_count}")
    print(f"Label Mismatches:                {len(label_mismatches)}")
    print(f"Image Dimensions:                {dimensions_set}")
    print(f"Image Color Modes:               {modes_set}")
    print(f"Channels:                        {channels_set}")

    print("\nDuplicate file groups:")
    for h, flist in duplicate_groups.items():
        print(f"  Group Hash {h[:12]}... ({len(flist)} files):")
        for f, pid, lbl in flist:
            print(f"    - {lbl}/{f.name} (Participant ID: {pid})")

    print("\nCohort distribution:")
    for cohort, count in cohort_distribution.items():
        print(f"  {cohort}: {count} images")

    print("\nSite distribution (top 10):")
    for site, count in list(site_distribution.items())[:10]:
        print(f"  {site}: {count} images")

    # STEP 2: LEAKAGE-FREE PARTICIPANT-LEVEL SPLIT
    print("\n" + "=" * 70)
    print("STEP 2: PARTICIPANT-LEVEL SPLIT PROPOSAL (PREVENTING DATA LEAKAGE)")
    print("=" * 70)

    # To prevent leakage:
    # 1. Group by participant_id (here 1 image per participant, 2,221 total).
    # 2. Account for exact duplicates: 50286 and 50279 are identical; 29241 and 29245 are identical.
    #    Identical duplicate pairs MUST be in the same split (e.g. train) or one copy excluded to prevent test leakage!
    # 3. Stratify by (DX_GROUP, Cohort).
    # 4. Standard 70% Train, 15% Validation, 15% Test.

    # Stratified split on unique participants
    # Aggregate participant-level metadata
    participants_df = df_manifest.drop_duplicates(subset=["participant_id"]).copy()
    participants_df["strat_key"] = participants_df["cohort"].astype(str) + "_" + participants_df["expected_dx"].astype(str)

    from sklearn.model_selection import StratifiedShuffleSplit

    # 70% Train, 30% Temp (Val + Test)
    sss1 = StratifiedShuffleSplit(n_splits=1, test_size=0.30, random_state=42)
    train_idx, temp_idx = next(sss1.split(participants_df, participants_df["strat_key"]))

    train_participants = participants_df.iloc[train_idx].copy()
    temp_participants = participants_df.iloc[temp_idx].copy()

    # Split temp 50/50 -> 15% Val, 15% Test
    sss2 = StratifiedShuffleSplit(n_splits=1, test_size=0.50, random_state=42)
    val_idx, test_idx = next(sss2.split(temp_participants, temp_participants["strat_key"]))

    val_participants = temp_participants.iloc[val_idx].copy()
    test_participants = temp_participants.iloc[test_idx].copy()

    train_pids = set(train_participants["participant_id"])
    val_pids = set(val_participants["participant_id"])
    test_pids = set(test_participants["participant_id"])

    # Ensure duplicate pairs are NOT split across train and val/test!
    for h, flist in duplicate_groups.items():
        pids_in_group = [pid for _, pid, _ in flist]
        # Check which splits they belong to
        splits_present = []
        if any(p in train_pids for p in pids_in_group):
            splits_present.append("train")
        if any(p in val_pids for p in pids_in_group):
            splits_present.append("val")
        if any(p in test_pids for p in pids_in_group):
            splits_present.append("test")

        print(f"  Audit duplicate pair {pids_in_group}: present in splits {splits_present}")
        # Fix: Move all duplicates in group to 'train' to prevent leakage
        for p in pids_in_group:
            if p in val_pids:
                val_pids.remove(p)
                train_pids.add(p)
            if p in test_pids:
                test_pids.remove(p)
                train_pids.add(p)

    # Assign split to manifest
    def get_split(pid):
        if pid in train_pids:
            return "train"
        if pid in val_pids:
            return "val"
        if pid in test_pids:
            return "test"
        return "unassigned"

    df_manifest["split"] = df_manifest["participant_id"].apply(get_split)

    split_counts = df_manifest.groupby(["split", "expected_dx"]).size().unstack(fill_value=0)
    split_counts.columns = ["ASD (DX=1)", "Control (DX=2)"]
    split_counts["Total Images"] = split_counts.sum(axis=1)

    participant_split_counts = df_manifest.groupby(["split", "expected_dx"])["participant_id"].nunique().unstack(fill_value=0)
    participant_split_counts.columns = ["ASD (DX=1)", "Control (DX=2)"]
    participant_split_counts["Total Participants"] = participant_split_counts.sum(axis=1)

    print("\nProposed Participant-Level Split (Leakage-Free):")
    print("\nImage counts per split:")
    print(split_counts.to_string())

    print("\nParticipant counts per split:")
    print(participant_split_counts.to_string())

    # Save splits manifest
    SPLITS_CSV_OUTPUT = PROJECT_ROOT / "data_config" / "mri_2d_splits.csv"
    df_manifest.to_csv(SPLITS_CSV_OUTPUT, index=False)
    print(f"\n[+] Verified dataset splits saved to: {SPLITS_CSV_OUTPUT}")

    # Save json audit summary
    audit_summary = {
        "total_images": total_images,
        "unique_participants": unique_participants,
        "asd_participants": asd_participants,
        "control_participants": control_participants,
        "asd_images": autistic_images,
        "control_images": control_images,
        "duplicate_groups_count": len(duplicate_groups),
        "duplicate_groups": {h: [f[0].name for f in flist] for h, flist in duplicate_groups.items()},
        "corrupted_images_count": corrupted_count,
        "missing_metadata_count": missing_metadata_count,
        "label_mismatches_count": len(label_mismatches),
        "image_dimensions": [list(d) for d in dimensions_set],
        "image_modes": list(modes_set),
        "cohort_distribution": cohort_distribution,
        "site_distribution": site_distribution,
        "splits_summary": {
            "train": {
                "total": int(split_counts.loc["train", "Total Images"]),
                "asd": int(split_counts.loc["train", "ASD (DX=1)"]),
                "control": int(split_counts.loc["train", "Control (DX=2)"]),
            },
            "val": {
                "total": int(split_counts.loc["val", "Total Images"]),
                "asd": int(split_counts.loc["val", "ASD (DX=1)"]),
                "control": int(split_counts.loc["val", "Control (DX=2)"]),
            },
            "test": {
                "total": int(split_counts.loc["test", "Total Images"]),
                "asd": int(split_counts.loc["test", "ASD (DX=1)"]),
                "control": int(split_counts.loc["test", "Control (DX=2)"]),
            },
        }
    }

    with open(AUDIT_JSON_OUTPUT, "w") as f:
        json.dump(audit_summary, f, indent=2)
    print(f"[+] Audit JSON summary saved to: {AUDIT_JSON_OUTPUT}")

    print("\n" + "=" * 70)
    print("INSPECTION AND AUDIT COMPLETE!")
    print("=" * 70)


if __name__ == "__main__":
    inspect_all()
