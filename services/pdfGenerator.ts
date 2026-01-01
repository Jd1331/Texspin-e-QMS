
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ControlPlan, InspectionRecord, InspectionStatus, PokaYokeRecord, ProcessSetupRecord, ProcessSetupMaster, ProcessValidationPlan } from "../types";
import { getUserSignature } from "./mockBackend";
import { BRANDING } from "./branding";

// Helper to add Logo
const addHeaderLogo = (doc: jsPDF) => {
    try {
        const pageWidth = doc.internal.pageSize.getWidth();
        // Add Logo at Top Right
        doc.addImage(BRANDING.logoBase64, 'PNG', pageWidth - 50, 10, 35, 12);
    } catch (e) {
        // Fallback text if image fails
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFontSize(14);
        doc.setTextColor(0, 50, 100);
        doc.text("TEXSPIN", pageWidth - 40, 18);
    }
};

// ... [Existing Control Plan & Inspection PDF functions remain unchanged] ...
export const generateControlPlanPDF = (plan: ControlPlan) => {
    try {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        addHeaderLogo(doc);

        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text(BRANDING.appName, 14, 15);
        
        doc.setFontSize(12);
        doc.text("CONTROL PLAN DOCUMENT", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const metaY = 30;
        
        doc.text(`Control Plan No: ${String(plan.controlPlanNumber || '-')}`, 14, metaY);
        doc.text(`Part Number: ${String(plan.partNumber || '-')}`, 80, metaY);
        doc.text(`Part Name: ${String(plan.partName || '-')}`, 140, metaY);
        
        doc.text(`Process Family: ${String(plan.processFamily || '-')}`, 14, metaY + 6);
        doc.text(`Phase: ${String(plan.phase || '-')}`, 80, metaY + 6);
        doc.text(`Version: ${String(plan.version)} (${String(plan.status)})`, 140, metaY + 6);
        
        doc.text(`Approval Date: ${String(plan.approvalDate || '-')}`, 14, metaY + 12);
        doc.text(`Core Team: TBL CFT Member`, 80, metaY + 12);

        const tableBody = plan.items.map(item => [
            String(item.stepNumber || ''),
            String(item.processName || ''),
            String(item.machineDevice || ''),
            String(item.productDesc || item.processDesc || ''),
            String(item.specialCharClass || ''),
            String(item.tolerance || ''),
            String(item.lsl || '-'),
            String(item.usl || '-'),
            String(item.unit || '-'),
            String(item.evaluationTechnique || ''),
            `${item.sampleSize || ''} / ${item.frequency || ''}`,
            String(item.controlMethod || ''),
            String(item.reactionPlan || ''),
            String(item.responsibility || ''),
            item.isPokaYoke ? "YES" : "NO",
            item.isActive ? "Active" : "De-Active"
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['Step', 'Process', 'Machine', 'Char Desc', 'Spl', 'Spec', 'LCL', 'UCL', 'Unit', 'Eval Method', 'Freq', 'Control', 'Reaction', 'Resp', 'PY', 'Status']],
            body: tableBody,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                3: { cellWidth: 35 },
                12: { cellWidth: 25 },
                15: { fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.row.raw[15] === 'De-Active') {
                    data.cell.styles.textColor = [150, 150, 150];
                }
            }
        });

        const pageCount = doc.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
        }

        doc.save(`ControlPlan_${plan.partNumber}_${plan.processFamily}_V${plan.version}.pdf`);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert(`Failed to generate Control Plan PDF. Error: ${(error as Error).message}`);
    }
};

export const generateInspectionPDF = (record: InspectionRecord, plan: ControlPlan) => {
    try {
        if (!record || !plan) {
            throw new Error("Missing Record or Control Plan Data");
        }
        if (!record.readings) {
            throw new Error("No readings found in inspection record");
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        addHeaderLogo(doc);

        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("INSPECTION REPORT", 14, 15);
        doc.setFontSize(10);
        doc.text(BRANDING.appName, 14, 20);

        const metaY = 30;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);

        doc.text(`Inspection Type: ${String(record.type)}`, 14, metaY);
        doc.text(`Record ID: ${String(record.id).substring(0,8)}`, 80, metaY);
        doc.text(`Date: ${new Date(record.timestamp).toLocaleString()}`, 140, metaY);

        doc.text(`Part Number: ${String(record.partNumber)}`, 14, metaY + 6);
        doc.text(`Process: ${String(record.processFamily)}`, 80, metaY + 6);
        doc.text(`Scope: ${String(record.operationStep)}`, 140, metaY + 6);

        doc.text(`CP Version: V${String(plan.version)}`, 14, metaY + 12);
        doc.text(`Inspector: ${String(record.inspectorName)}`, 80, metaY + 12);
        
        doc.setFontSize(14);
        if (record.overallResult === 'OK') {
            doc.setTextColor(0, 128, 0); 
        } else {
            doc.setTextColor(200, 0, 0);
        }
        doc.text(`Result: ${String(record.overallResult)}`, 14, metaY + 22);
        
        doc.setFontSize(10);
        if (record.status === InspectionStatus.APPROVED) {
            doc.setTextColor(0, 100, 0);
            doc.text("STATUS: APPROVED", 80, metaY + 22);
        } else if (record.status === InspectionStatus.REJECTED) {
            doc.setTextColor(200, 0, 0);
            doc.text("STATUS: REJECTED", 80, metaY + 22);
        } else {
            doc.setTextColor(200, 150, 0);
            doc.text("STATUS: PENDING APPROVAL", 80, metaY + 22);
        }
        doc.setTextColor(0, 0, 0);

        const itemsToPrint = plan.items
            .filter(i => i.isActive)
            .sort((a, b) => a.stepNumber.localeCompare(b.stepNumber));
        
        const tableBody = itemsToPrint.map(item => {
            const reading = record.readings[item.id] || { values: [null, null, null, null, null], result: 'N/A', remark: '' };
            const r1 = (reading.values[0] !== null && reading.values[0] !== undefined) ? String(reading.values[0]) : '';
            const r2 = (reading.values[1] !== null && reading.values[1] !== undefined) ? String(reading.values[1]) : '';
            const r3 = (reading.values[2] !== null && reading.values[2] !== undefined) ? String(reading.values[2]) : '';
            const r4 = (reading.values[3] !== null && reading.values[3] !== undefined) ? String(reading.values[3]) : '';
            const r5 = (reading.values[4] !== null && reading.values[4] !== undefined) ? String(reading.values[4]) : '';

            return [
                String(item.stepNumber || ''),
                String(item.productDesc || item.processName || ''),
                String(item.specialCharClass || ''),
                String(item.lsl !== undefined ? item.lsl : '-'),
                String(item.usl !== undefined ? item.usl : '-'),
                String(item.unit || '-'),
                r1, r2, r3, r4, r5,
                String(reading.result || ''),
                String(reading.remark || '')
            ];
        });

        autoTable(doc, {
            startY: metaY + 30,
            head: [['Step', 'Characteristic', 'Spl', 'LCL', 'UCL', 'Unit', 'R1', 'R2', 'R3', 'R4', 'R5', 'Result', 'Rem']],
            body: tableBody,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'center' },
            headStyles: { fillColor: [50, 50, 50], textColor: 255 },
            columnStyles: {
                1: { cellWidth: 50, halign: 'left' },
                11: { fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 11) {
                    if (data.cell.raw === 'NG') {
                        data.cell.styles.fillColor = [255, 200, 200];
                        data.cell.styles.textColor = [200, 0, 0];
                    } else if (data.cell.raw === 'OK') {
                        data.cell.styles.textColor = [0, 128, 0];
                    }
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;
        const pageHeight = doc.internal.pageSize.getHeight();
        
        let footerY = finalY;
        if (footerY > pageHeight - 40) {
            doc.addPage();
            footerY = 20;
        }
        
        doc.setLineWidth(0.5);
        doc.line(14, footerY, 80, footerY);
        doc.setFontSize(9);
        doc.text(`Inspected By: ${record.inspectorName}`, 14, footerY + 5);
        doc.text(`Date: ${new Date(record.timestamp).toLocaleDateString()}`, 14, footerY + 10);

        doc.line(120, footerY, 190, footerY);
        doc.text("Approved By - HOD", 120, footerY + 5);

        if (record.status === InspectionStatus.APPROVED && record.approvedBy) {
            doc.text(`Name: ${record.approvedBy}`, 120, footerY + 10);
            if (record.approvalDate) {
                 doc.text(`Date: ${new Date(record.approvalDate).toLocaleDateString()}`, 120, footerY + 15);
            }
            if (record.approvalRemark) {
                doc.setFontSize(8);
                doc.setTextColor(80, 80, 80);
                doc.text(`Remark: ${record.approvalRemark}`, 120, footerY + 20);
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
            }

            if (record.approverId) {
                const sig = getUserSignature(record.approverId);
                if (sig) {
                    try {
                        doc.addImage(sig, 'PNG', 120, footerY - 15, 30, 10);
                    } catch (e) {
                        doc.text("(Signed Digitally)", 150, footerY - 5);
                    }
                }
            }
        } else {
             doc.setTextColor(150);
             doc.text("(Pending Approval)", 120, footerY + 15);
             doc.setTextColor(0);
        }

        doc.save(`Inspection_${record.partNumber}_${record.processFamily}_${record.id.substring(0,8)}.pdf`);
    } catch (error) {
        console.error("Inspection PDF Generation Error:", error);
        alert(`Failed to generate Inspection PDF. Error: ${(error as Error).message}`);
    }
};

export const generatePokaYokePDF = (record: PokaYokeRecord) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    addHeaderLogo(doc);
    
    doc.setFontSize(14);
    doc.text("POKA-YOKE VERIFICATION CHECK SHEET", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Part No: ${record.partNumber}`, 14, 30);
    doc.text(`Machine: ${record.machineNo}`, 100, 30);
    doc.text(`Date: ${record.date}`, 14, 36);
    doc.text(`Shift: ${record.shift}`, 100, 36);

    const tableBody = record.verifications.map(v => [
        v.checkPoint,
        v.method,
        v.spec,
        v.actualObservation,
        v.status
    ]);

    autoTable(doc, {
        startY: 45,
        head: [['Check Point / Failure Mode', 'Method', 'Master Value', 'Observation', 'Result']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
                data.cell.styles.textColor = data.cell.raw === 'OK' ? [0, 128, 0] : [200, 0, 0];
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.text(`Checked By: ${record.verifiedBy}`, 14, finalY);
    doc.text(`Supervisor: ${record.supervisorName || 'Pending'}`, 100, finalY);
    
    doc.save(`PokaYoke_${record.partNumber}_${record.date}.pdf`);
};

export const generateProcessApprovalPDF = (record: ProcessSetupRecord, master: ProcessSetupMaster) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    addHeaderLogo(doc);

    doc.setFontSize(14);
    doc.text("PROCESS APPROVAL CHECK SHEET", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Part: ${master.partNumber}`, 14, 30);
    doc.text(`Machine: ${master.machineNo}`, 100, 30);
    doc.text(`Process: ${master.processName}`, 14, 36);
    doc.text(`Date/Shift: ${record.date} / ${record.shift}`, 100, 36);

    const tableBody = master.parameters.map(p => {
        const reading = record.readings[p.id];
        return [
            p.name,
            p.specification,
            p.controlMethod,
            reading?.actualValue || '-',
            reading?.status || '-'
        ];
    });

    autoTable(doc, {
        startY: 45,
        head: [['Parameter', 'Specification', 'Method', 'Actual', 'Status']],
        body: tableBody,
        theme: 'grid'
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.text(`Setup By: ${record.checkedBy}`, 14, finalY);
    doc.text(`Approved By: ${record.approvedBy || '-'}`, 100, finalY);
    doc.text(`Overall Status: ${record.status}`, 14, finalY + 8);
    
    doc.save(`ProcessSetup_${master.partNumber}_${record.date}.pdf`);
};

// --- REFINED: PROCESS VALIDATION PDF ---
export const generateValidationPDF = (plan: ProcessValidationPlan) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    addHeaderLogo(doc);

    // Header
    doc.setFontSize(16);
    doc.setTextColor(0, 50, 100);
    doc.text("PROCESS VALIDATION REPORT (SC)", 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    const metaY = 25;
    doc.text(`Part No: ${plan.partNumber}`, 14, metaY);
    doc.text(`Part Name: ${plan.partName}`, 80, metaY);
    doc.text(`Line/Machine: ${plan.lineMachineNo}`, 160, metaY);
    
    doc.text(`Type: ${plan.validationType}`, 14, metaY + 6);
    doc.text(`CP Ref: ${plan.controlPlanRef}`, 80, metaY + 6);
    doc.text(`Date: ${plan.validationDate}`, 160, metaY + 6);

    let currentY = metaY + 15;

    // Loop through Processes
    plan.processes.forEach(proc => {
        // Process Title
        doc.setFillColor(230, 230, 230);
        doc.rect(14, currentY, 269, 8, 'F');
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Process: ${proc.processName}`, 16, currentY + 5.5);
        currentY += 8;

        // Build Table Rows for Parameters
        const bodyRows: any[] = [];
        
        proc.parameters.forEach(param => {
            const rowSpan = param.trials.length;
            
            param.trials.forEach((trial, index) => {
                const readingStr = trial.readings.map(r => r !== null ? r : '-').join(',  ');
                const row = [
                    index === 0 ? param.name : '', // Only show name on first row (pseudo rowspan)
                    index === 0 ? `${param.specification} ${param.unit}` : '',
                    `Trial ${trial.trialNo}`,
                    readingStr,
                    trial.observation,
                    trial.status
                ];
                bodyRows.push(row);
            });
            // Separator row (empty) handled by logic or theme? standard table
        });

        autoTable(doc, {
            startY: currentY,
            head: [['Parameter', 'Specification', 'Trial', 'Readings (M1 - M5)', 'Observation', 'Result']],
            body: bodyRows,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
            headStyles: { fillColor: [50, 50, 50], textColor: 255 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 },
                1: { cellWidth: 35 },
                2: { cellWidth: 15 },
                5: { fontStyle: 'bold', cellWidth: 20 }
            },
            didParseCell: (data) => {
                 if (data.section === 'body' && data.column.index === 5) {
                    if (data.cell.raw === 'NG') {
                        data.cell.styles.textColor = [200, 0, 0];
                    } else if (data.cell.raw === 'OK') {
                        data.cell.styles.textColor = [0, 128, 0];
                    }
                }
            }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 10;
        
        // Page break check
        if (currentY > 180) {
            doc.addPage();
            currentY = 20;
        }
    });

    const finalY = currentY + 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.line(14, finalY, 80, finalY);
    doc.text(`Validated By: ${plan.validatedBy}`, 14, finalY + 5);
    
    if (plan.approvedBy) {
        doc.line(120, finalY, 190, finalY);
        doc.text(`Approved By: ${plan.approvedBy}`, 120, finalY + 5);
    }

    doc.save(`ValidationReport_${plan.partNumber}_${plan.validationDate}.pdf`);
};
