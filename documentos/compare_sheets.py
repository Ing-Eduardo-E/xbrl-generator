# -*- coding: utf-8 -*-
import openpyxl
import os

def get_sheets(file_path):
    if not os.path.exists(file_path):
        return set()
    try:
        wb = openpyxl.load_workbook(file_path, read_only=True)
        sheets = set(wb.sheetnames)
        wb.close()
        return sheets
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return set()

grupos_files = {
    "Grupo 1": "/home/ubuntu/informes_niif/Grupo 1/Grupo1_Individual_Directo_ID20037_2024-12-31.xlsx",
    "Grupo 2": "/home/ubuntu/informes_niif/Grupo 2/Grupo2_Individual_Indirecto_ID20037_2024-12-31.xlsx",
    "Grupo 3": "/home/ubuntu/informes_niif/Grupo 3/Grupo3_ID20037_2024-12-31.xlsx",
    "R414": "/home/ubuntu/informes_niif/R414/R414Ind_ID20037_2024-12-31.xlsx",
}

all_sheets = set()
sheets_by_group = {}

for grupo, file_path in grupos_files.items():
    sheets = get_sheets(file_path)
    sheets_by_group[grupo] = sheets
    all_sheets.update(sheets)

# Create a presence matrix
header = ["Sheet Name"] + list(grupos_files.keys())
print("| " + " | ".join(header) + " |")
print("|" + "---|" * len(header))

for sheet in sorted(list(all_sheets)):
    row = [sheet]
    for grupo in grupos_files.keys():
        presence = "✅" if sheet in sheets_by_group[grupo] else "❌"
        row.append(presence)
    print("| " + " | ".join(row) + " |")
