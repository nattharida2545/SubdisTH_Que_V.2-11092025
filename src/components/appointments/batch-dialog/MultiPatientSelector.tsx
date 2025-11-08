import React, { useState } from "react";
import { Search, X, GripVertical, Navigation, ArrowUpDown } from "lucide-react";
import { Patient } from "@/integrations/supabase/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface MultiPatientSelectorProps {
  selectedPatients: Patient[];
  onAddPatient: (patient: Patient) => void;
  onRemovePatient: (patientId: string) => void;
  onMovePatient: (fromIndex: number, toIndex: number) => void;
  onSortByDistance: () => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearch: () => Promise<void>;
  searchResults: Patient[];
}

export const MultiPatientSelector: React.FC<MultiPatientSelectorProps> = ({
  selectedPatients,
  onAddPatient,
  onRemovePatient,
  onMovePatient,
  onSortByDistance,
  searchTerm,
  onSearchTermChange,
  onSearch,
  searchResults,
}) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  // Disable sort-by-distance if any selected patient lacks distance info
  const canSortByDistance =
    selectedPatients.length > 1 &&
    selectedPatients.every(
      (p) => p.distance_from_hospital !== null && p.distance_from_hospital !== undefined
    );

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingIndex !== null && draggingIndex !== index) {
      onMovePatient(draggingIndex, index);
      setDraggingIndex(index);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>ค้นหาและเลือกผู้ป่วย</Label>
        <div className="flex gap-2 mt-1">
          <Input
            placeholder="ค้นหาด้วยชื่อ เบอร์โทรศัพท์ เลขบัตรประชาชนผู้ป่วย..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={onSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
          <div className="text-sm font-medium mb-2">ผลการค้นหา</div>
          {searchResults.map((patient) => (
            <div
              key={patient.id}
              className="p-2 hover:bg-gray-100 flex justify-between items-center rounded-md"
            >
              <div>
                <div className="font-medium">{patient.name}</div>
                <div className="text-sm text-gray-500">{patient.phone}</div>
                {patient.distance_from_hospital && (
                  <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Navigation className="h-3 w-3" />
                    {patient.distance_from_hospital} กม.
                  </div>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => onAddPatient(patient)}
              >
                เพิ่ม
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Selected Patients */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <Label>ผู้ป่วยที่เลือก ({selectedPatients.length})</Label>
          <div className="flex items-center gap-2">
            {selectedPatients.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSortByDistance}
                disabled={!canSortByDistance}
                title={
                  !canSortByDistance
                    ? "ไม่สามารถเรียงตามระยะทางได้ (มีผู้ป่วยที่ไม่มีข้อมูลระยะทาง)"
                    : undefined
                }
                className="text-xs"
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                เรียงตามระยะทาง
              </Button>
            )}
            {selectedPatients.length > 0 && (
              <span className="text-xs text-gray-500">
              ลำดับการเข้ารับการรักษา (drag & drop เพื่อเปลี่ยนลำดับ)
              </span>
            )}
          </div>
        </div>

        {selectedPatients.length > 0 ? (
          <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
            {selectedPatients.map((patient, index) => (
              <div
                key={patient.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                className="flex items-center justify-between p-2 hover:bg-gray-50 border-b last:border-b-0"
              >
                <div className="flex items-center space-x-2">
                  <div className="cursor-grab">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {patient.name}
                      <Badge variant="outline">{index + 1}</Badge>
                    </div>
                    <div className="text-sm text-gray-500">{patient.phone}</div>
                    {patient.distance_from_hospital && (
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Navigation className="h-3 w-3" />
                        {patient.distance_from_hospital} กม.
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemovePatient(patient.id)}
                  className="text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded-md p-6 text-center text-gray-500">
            ยังไม่ได้เลือกผู้ป่วย
          </div>
        )}
      </div>
    </div>
  );
};
