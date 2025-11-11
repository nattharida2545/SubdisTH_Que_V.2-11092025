
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { PatientMedication } from '@/hooks/usePatientMedications';
import { formatThaiDate } from '@/utils/dateUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PatientMedicationHistoryProps {
  patientName?: string;
  medications: PatientMedication[];
  loading: boolean;
  onRefresh?: () => void;
  showCheckNotes?: boolean; // Show check notes column (for PatientDashboard and InsQueue)
}

const PatientMedicationHistory: React.FC<PatientMedicationHistoryProps> = ({
  patientName,
  medications,
  loading,
  onRefresh,
  showCheckNotes = false
}) => {
  const [checkNotes, setCheckNotes] = useState<Record<string, string>>({});
  const [checkImages, setCheckImages] = useState<Record<string, Array<{ id: string; image_path: string }>>>({});
  const [selectedCheckNote, setSelectedCheckNote] = useState<string | null>(null);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const [loadingCheckNotes, setLoadingCheckNotes] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('PatientMedicationHistory updated:', {
      patientName,
      medicationsCount: medications.length,
      loading,
      medications
    });
  }, [patientName, medications, loading]);

  // Fetch check notes and images for medications that have patient_check_id
  useEffect(() => {
    const fetchCheckNotesAndImages = async () => {
      const checkIds = medications
        .filter(med => med.patient_check_id)
        .map(med => med.patient_check_id!);
      
      if (checkIds.length === 0) return;

      setLoadingCheckNotes(true);
      try {
        const { data, error } = await supabase
          .from('patient_check')
          .select('id, check_note')
          .in('id', checkIds);

        if (!error && data) {
          const notesMap: Record<string, string> = {};
          data.forEach(check => {
            notesMap[check.id] = check.check_note || '';
          });
          setCheckNotes(notesMap);
        }

        // Fetch images for each check
        const { data: imagesData, error: imagesError } = await supabase
          .from('patient_check_images')
          .select('id, patient_check_id, image_path')
          .in('patient_check_id', checkIds)
          .order('order_index', { ascending: true });

        if (!imagesError && imagesData) {
          const imagesMap: Record<string, Array<{ id: string; image_path: string }>> = {};
          imagesData.forEach(img => {
            if (!imagesMap[img.patient_check_id]) {
              imagesMap[img.patient_check_id] = [];
            }
            // Convert storage path to public URL
            const { data: urlData } = supabase.storage
              .from('patient_check_images')
              .getPublicUrl(img.image_path);
            imagesMap[img.patient_check_id].push({
              id: img.id,
              image_path: urlData.publicUrl
            });
          });
          setCheckImages(imagesMap);
        }
      } catch (error) {
        console.error('Error fetching check notes and images:', error);
      } finally {
        setLoadingCheckNotes(false);
      }
    };

    fetchCheckNotesAndImages();
  }, [medications]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          ประวัติการรับยาของ {patientName || 'ผู้ป่วย'}
        </CardTitle>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : medications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-2">ไม่พบประวัติการรับยา</div>
            <div className="text-sm">เมื่อจ่ายยาแล้ว ประวัติจะแสดงที่นี่</div>
          </div>
        ) : (
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ชื่อยา</TableHead>
                  <TableHead>รหัสยา</TableHead>
                  <TableHead>ขนาดยา</TableHead>
                  <TableHead>คำแนะนำ</TableHead>
                  {showCheckNotes && (
                    <TableHead className="text-center">บันทึกการตรวจ</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {medications.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatThaiDate(med.start_date)}
                    </TableCell>
                    <TableCell>{med.medication?.name || 'ไม่ระบุ'}</TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {med.medication?.code || '-'}
                    </TableCell>
                    <TableCell>{med.dosage}</TableCell>
                    <TableCell className="max-w-[250px] break-words">
                      {med.instructions || '-'}
                    </TableCell>
                    {showCheckNotes && (
                      <TableCell className="text-center">
                        {med.patient_check_id && checkNotes[med.patient_check_id] ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCheckNote(checkNotes[med.patient_check_id!]);
                              setSelectedCheckId(med.patient_check_id!);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Check Note Dialog */}
      <Dialog open={!!selectedCheckNote} onOpenChange={() => {
        setSelectedCheckNote(null);
        setSelectedCheckId(null);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>บันทึกการตรวจ/การรักษา</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {/* Check Note */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium mb-2 text-gray-700">บันทึก:</p>
              <p className="text-sm whitespace-pre-wrap">{selectedCheckNote}</p>
            </div>

            {/* Images */}
            {selectedCheckId && checkImages[selectedCheckId] && checkImages[selectedCheckId].length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  รูปภาพ ({checkImages[selectedCheckId].length} รูป)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {checkImages[selectedCheckId].map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.image_path}
                        alt="Check image"
                        className="w-full h-40 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='14' fill='%23999' text-anchor='middle' dy='.3em'%3ENo image%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
                        <a
                          href={img.image_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 bg-white text-blue-600 px-3 py-1 rounded text-xs font-medium transition-opacity"
                        >
                          ดูเต็มจอ
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PatientMedicationHistory;
