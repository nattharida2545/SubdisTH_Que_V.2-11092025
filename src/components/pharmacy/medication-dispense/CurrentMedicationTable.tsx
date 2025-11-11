import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Save, Plus, Upload, X, Image as ImageIcon, Camera } from "lucide-react";
import { Medication } from "@/integrations/supabase/schema";
import { toast } from "sonner";
import MedicationSearchField from "./MedicationSearchField";
import CameraCapture from "./CameraCapture";

export interface CurrentMedication {
  id: string;
  medication: Medication;
  dosage: string;
  instructions: string;
  dispensed: string;
}

interface CurrentMedicationTableProps {
  medications: CurrentMedication[];
  availableMedications: Medication[];
  checkNote: string;
  onCheckNoteChange: (note: string) => void;
  checkNoteImages: File[];
  onCheckNoteImagesChange: (images: File[]) => void;
  onAddMedication: (medication: CurrentMedication) => void;
  onUpdateMedication: (id: string, updates: Partial<CurrentMedication>) => void;
  onRemoveMedication: (id: string) => void;
  onSaveAll: () => void;
  isLoading: boolean;
}

const CurrentMedicationTable: React.FC<CurrentMedicationTableProps> = ({
  medications,
  availableMedications,
  checkNote,
  onCheckNoteChange,
  checkNoteImages,
  onCheckNoteImagesChange,
  onAddMedication,
  onUpdateMedication,
  onRemoveMedication,
  onSaveAll,
  isLoading,
}) => {
  const [selectedMedication, setSelectedMedication] =
    useState<Medication | null>(null);
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dispensed, setdispensed] = useState("");
  const [open, setOpen] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddMedication = () => {
    if (!selectedMedication || !dosage.trim()) {
      toast.error("กรุณาเลือกยาและใส่ขนาดยา");
      return;
    }

    // Check for duplicates in current list
    const existsInCurrent = medications.some(
      (med) =>
        med.medication.id === selectedMedication.id &&
        med.dosage.trim() === dosage.trim()
    );

    if (existsInCurrent) {
      toast.error("ยาและขนาดยานี้มีอยู่ในรายการแล้ว");
      return;
    }

    const newMedication: CurrentMedication = {
      id: `new-${Date.now()}`,
      medication: selectedMedication,
      dosage: dosage.trim(),
      instructions: instructions.trim(),
      dispensed: dispensed,
    };

    onAddMedication(newMedication);

    // Clear form
    setSelectedMedication(null);
    setDosage("");
    setInstructions("");
    setdispensed("");
  };

  const handleDosageChange = (id: string, newDosage: string) => {
    if (newDosage.trim()) {
      // Check for duplicates in current list when updating dosage
      const medication = medications.find((med) => med.id === id);
      if (medication) {
        const existsInCurrent = medications.some(
          (med) =>
            med.id !== id &&
            med.medication.id === medication.medication.id &&
            med.dosage === newDosage.trim()
        );

        if (existsInCurrent) {
          toast.error("ขนาดยานี้มีอยู่ในรายการแล้ว");
          return;
        }
      }

      onUpdateMedication(id, { dosage: newDosage.trim() });
    }
  };

  const handleInstructionsChange = (id: string, newInstructions: string) => {
    onUpdateMedication(id, { instructions: newInstructions });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const maxSize = 5 * 1024 * 1024; // 5MB per file

    // Validate file size and type
    const validFiles: File[] = [];
    for (const file of newFiles) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} ไม่ใช่ไฟล์รูปภาพ`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} มีขนาดใหญ่เกิน 5MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Check total image count
    const totalImages = checkNoteImages.length + validFiles.length;
    if (totalImages > 10) {
      toast.error(`สามารถอัพโหลดได้สูงสุด 10 รูป (ปัจจุบัน: ${checkNoteImages.length} รูป)`);
      return;
    }

    // Add new files and create previews
    onCheckNoteImagesChange([...checkNoteImages, ...validFiles]);

    // Create preview URLs
    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);

    toast.success(`อัพโหลดรูปภาพเรียบร้อย ${validFiles.length} รูป`);

    // Reset input
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = checkNoteImages.filter((_, i) => i !== index);
    onCheckNoteImagesChange(newImages);

    // Clean up preview URL
    if (imagePreviews[index]) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    toast.success("ลบรูปภาพแล้ว");
  };

  const handleCameraCapture = (file: File) => {
    if (checkNoteImages.length >= 10) {
      toast.error("สามารถอัพโหลดได้สูงสุด 10 รูป");
      return;
    }

    // Add file and create preview
    onCheckNoteImagesChange([...checkNoteImages, file]);
    const preview = URL.createObjectURL(file);
    setImagePreviews((prev) => [...prev, preview]);
    toast.success("บันทึกรูปภาพเรียบร้อย");
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">รายการยาที่จะจ่าย</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Check Note Section */}
        <div className="space-y-2 p-3 border rounded-lg bg-blue-50">
          <label className="text-sm font-medium text-blue-900">
            บันทึกการตรวจ/การรักษา
          </label>
          <Textarea
            value={checkNote}
            onChange={(e) => onCheckNoteChange(e.target.value)}
            placeholder="บันทึกอาการ, การวินิจฉัย, และการรักษา..."
            className="text-sm min-h-[80px] bg-white"
          />

          {/* Image Upload Section */}
          <div className="space-y-2 mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-blue-900">
                📸 ถ่ายรูป/อัพโหลดภาพ ({checkNoteImages.length}/10)
              </label>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={checkNoteImages.length >= 10}
            />

            {/* Upload Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setShowCameraModal(true)}
                variant="outline"
                size="sm"
                disabled={checkNoteImages.length >= 10}
                className="w-full"
              >
                <Camera className="w-3 h-3 mr-1" />
                ถ่ายรูป
              </Button>
              <Button
                onClick={triggerFileInput}
                variant="outline"
                size="sm"
                disabled={checkNoteImages.length >= 10}
                className="w-full"
              >
                <Upload className="w-3 h-3 mr-1" />
                เลือกไฟล์
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              สูงสุด 10 รูป, ไฟล์ละ 5MB
            </p>

            {/* Image Previews */}
            {checkNoteImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square"
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                    <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-blue-700">
            💡 บันทึกและรูปภาพจะถูกบันทึกพร้อมกับการจ่ายยา
          </p>
        </div>
        {/* Add New Medication Form */}
        <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
          <h4 className="text-sm font-medium">เพิ่มยาใหม่</h4>

          <MedicationSearchField
            medications={availableMedications}
            selectedMedication={selectedMedication}
            onSelectMedication={setSelectedMedication}
            open={open}
            setOpen={setOpen}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">
                ขนาดยาที่ต้องรับประทาน
              </label>
              <Input
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="เช่น 500mg, 2 เม็ด"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">คำแนะนำ</label>
              <Input
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="เช่น กินหลังอาหาร"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">จำนวนยาที่จ่าย</label>
              <Input
                value={dispensed}
                onChange={(e) => setdispensed(e.target.value)}
                placeholder="เช่น 1 (ขวด), 20 (เม็ด)"
                className="text-sm"
              />
              {selectedMedication && (
                <div className="text-xs text-gray-500 mt-1">
                  หน่วย: {selectedMedication.unit}
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleAddMedication}
            disabled={!selectedMedication || !dosage.trim()}
            size="sm"
            className="w-full"
          >
            <Plus className="w-3 h-3 mr-1" />
            เพิ่มยา
          </Button>
        </div>

        {/* Current Medications List */}
        <div className="flex-1 overflow-auto border rounded-lg">
          {medications.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <div className="mb-2">ยังไม่มียาในรายการ</div>
                <div className="text-sm">
                  เพิ่มยาจากฟอร์มด้านบน หรือคัดลอกจากประวัติ
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  💡 คัดลอกจากประวัติแล้วแก้ไขขนาดยาได้
                </div>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อยา</TableHead>
                  <TableHead>ขนาดยา</TableHead>
                  <TableHead>คำแนะนำ</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medications.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">
                          {med.medication.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {med.medication.code} | คงเหลือ:{" "}
                          {med.medication.stock} {med.medication.unit}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={med.dosage}
                        onChange={(e) =>
                          handleDosageChange(med.id, e.target.value)
                        }
                        className="text-sm h-8"
                        placeholder="ขนาดยา"
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={med.instructions}
                        onChange={(e) =>
                          handleInstructionsChange(med.id, e.target.value)
                        }
                        className="text-sm min-h-[32px] h-8 resize-none"
                        placeholder="คำแนะนำ"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveMedication(med.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Save All Button */}
        {medications.length > 0 && (
          <Button
            onClick={onSaveAll}
            disabled={isLoading}
            className="w-full bg-pharmacy-600 hover:bg-pharmacy-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading
              ? "กำลังจ่ายยา..."
              : `จ่ายยาทั้งหมด (${medications.length} รายการ)`}
          </Button>
        )}
      </CardContent>
    </Card>

    {/* Camera Capture Modal */}
    {showCameraModal && (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={() => setShowCameraModal(false)}
      />
    )}
    </>
  );
};

export default CurrentMedicationTable;
