import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Patient } from "@/integrations/supabase/schema";
import { formatThaiDate } from "@/utils/dateUtils";
import { Phone, MapPin, Calendar, User, Loader2, IdCard, FileText, RefreshCw, ChevronDown, ChevronUp, Pill, UserCircle2, Navigation, MessageCircle, CalendarCheck } from "lucide-react";
import PatientMedicationHistory from "./PatientMedicationHistory";
import { usePatientMedications } from "@/hooks/usePatientMedications";
import { useMedicationsContext } from "@/components/medications/context/MedicationsContext";
import { useMedications } from "@/hooks/useMedications";
import EnhancedMedicationDispenseDialog from "./medication-dispense/EnhancedMedicationDispenseDialog";
import PharmacyDispenseView from "./PharmacyDispenseView";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface PatientInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  queueNumber?: string;
  queueId?: string;
  showPharmacyTab?: boolean;
  mode?: "dispense" | "view"; // dispense = ฟอร์มจ่ายยา, view = แสดงข้อมูลยาที่ต้องจ่าย
  showCheckNotes?: boolean; // Show check notes in medication history (default: true for non-view mode)
}

interface PatientCheck {
  id: string;
  patient_id: string;
  check_note: string | null;
  created_at: string;
}

const PatientInfoDialog: React.FC<PatientInfoDialogProps> = ({
  open,
  onOpenChange,
  patient,
  queueNumber,
  queueId,
  showPharmacyTab = true,
  mode = "dispense",
  showCheckNotes = true,
}) => {
  const [patientChecks, setPatientChecks] = useState<PatientCheck[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const [checkMedications, setCheckMedications] = useState<Record<string, any[]>>({});

  const {
    medications: patientMedications,
    loading: medicationsLoading,
    addMedication,
    fetchMedicationHistory,
  } = usePatientMedications(patient?.id);

  // Try to use context, but fallback to direct hook if not available
  let medications, medicationsListLoading;
  try {
    const context = useMedicationsContext();
    medications = context.medications;
    medicationsListLoading = context.loading;
  } catch (error) {
    // If context is not available, use the direct hook
    const directMedications = useMedications();
    medications = directMedications.medications;
    medicationsListLoading = directMedications.loading;
  }

  // Fetch patient check history
  const fetchPatientChecks = async () => {
    if (!patient?.id) return;
    
    setLoadingChecks(true);
    try {
      const { data, error } = await supabase
        .from('patient_check')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPatientChecks(data);
      }
    } catch (error) {
      console.error('Error fetching patient checks:', error);
    } finally {
      setLoadingChecks(false);
    }
  };

  // Fetch medications for a specific check
  const fetchCheckMedications = async (checkId: string) => {
    if (checkMedications[checkId]) {
      // Already fetched, just toggle
      setExpandedCheckId(expandedCheckId === checkId ? null : checkId);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('patient_medications')
        .select(`
          *,
          medication:medications(*)
        `)
        .eq('patient_check_id', checkId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCheckMedications(prev => ({ ...prev, [checkId]: data }));
        setExpandedCheckId(checkId);
      }
    } catch (error) {
      console.error('Error fetching check medications:', error);
    }
  };

  // Get medication count for a check (from already loaded data)
  const getMedicationCount = (checkId: string) => {
    return checkMedications[checkId]?.length || 0;
  };

  useEffect(() => {
    if (open && patient?.id) {
      fetchPatientChecks();
    } else if (!open) {
      // Reset expanded state when dialog closes
      setExpandedCheckId(null);
      setCheckMedications({});
    }
  }, [open, patient?.id]);

  if (!patient) return null;

  const safeMedications = Array.isArray(medications) ? medications : [];
  const safePatientMedications = Array.isArray(patientMedications)
    ? patientMedications
    : [];

  const handleRefreshHistory = () => {
    if (patient?.id) {
      console.log("Refreshing medication history for patient:", patient.id);
      fetchMedicationHistory(patient.id);
    }
  };

  const handleDispenseMedication = async (data: any) => {
    console.log("Dispensing medication in dialog:", data);
    const result = await addMedication(data);

    // Refresh history immediately after successful dispensing
    if (result && patient?.id) {
      setTimeout(() => {
        handleRefreshHistory();
        // Also refresh patient checks if there's a check note
        if (data.patient_check_id) {
          fetchPatientChecks();
        }
      }, 500); // Small delay to ensure data is saved
    }

    return result;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            ข้อมูลผู้ป่วย {queueNumber && `- คิว ${queueNumber}`}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList
            className={`grid w-full ${
              mode === "view" 
                ? (showPharmacyTab ? "grid-cols-3" : "grid-cols-2")
                : (showPharmacyTab ? "grid-cols-4" : "grid-cols-3")
            }`}
          >
            <TabsTrigger value="info">ข้อมูลส่วนตัว</TabsTrigger>
            <TabsTrigger value="history">ประวัติการรับยา</TabsTrigger>
            {mode !== "view" && (
              <TabsTrigger value="checks">ประวัติการตรวจ</TabsTrigger>
            )}
            {showPharmacyTab && (
              <TabsTrigger value="dispense">
                {mode === "view" ? "ยาที่ต้องจ่าย" : "จ่ายยา"}
              </TabsTrigger>
            )}
          </TabsList>

            <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลส่วนตัว</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">
                          ชื่อ-นามสกุล
                        </div>
                        <div className="font-medium">{patient.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        รหัสผู้ป่วย: {patient.patient_id}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <IdCard className="h-4 w-4 text-gray-500" />

                      <div>
                        <div className="text-sm text-gray-500">
                          เลขบัตรประชาชน
                        </div>
                        <div className="font-medium">
                          {patient.ID_card || "-"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">
                          เบอร์โทรศัพท์
                        </div>
                        <div className="font-medium">
                          {patient.phone || "-"}
                        </div>
                      </div>
                    </div>

                    {patient.birth_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">วันเกิด</div>
                          <div className="font-medium">
                            {formatThaiDate(patient.birth_date)}
                          </div>
                        </div>
                      </div>
                    )}

                    {patient.gender && (
                      <div className="flex items-center gap-2">
                        <UserCircle2 className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">เพศ</div>
                          <div className="font-medium">{patient.gender}</div>
                        </div>
                      </div>
                    )}

                    {patient.distance_from_hospital && (
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">
                            ระยะทางจากโรงพยาบาล
                          </div>
                          <div className="font-medium">
                            {patient.distance_from_hospital} กิโลเมตร
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {patient.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                        <div>
                          <div className="text-sm text-gray-500">ที่อยู่</div>
                          <div className="font-medium">{patient.address}</div>
                        </div>
                      </div>
                    )}

                    {patient.line_id && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">LINE ID</div>
                          <div className="font-medium">{patient.line_id}</div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">
                          วันที่ลงทะเบียน
                        </div>
                        <div className="font-medium">
                          {formatThaiDate(patient.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <PatientMedicationHistory
              patientName={patient.name}
              medications={safePatientMedications}
              loading={medicationsLoading}
              onRefresh={handleRefreshHistory}
              showCheckNotes={showCheckNotes}
            />
          </TabsContent>

          {mode !== "view" && (
            <TabsContent value="checks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  ประวัติการตรวจ/การรักษา
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPatientChecks}
                  disabled={loadingChecks}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingChecks ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingChecks ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : patientChecks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <div className="mb-2">ไม่พบประวัติการตรวจ</div>
                    <div className="text-sm">บันทึกการตรวจจะแสดงที่นี่</div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-auto">
                    {patientChecks.map((check) => (
                      <div
                        key={check.id}
                        className="border rounded-lg bg-blue-50 border-blue-200"
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">
                                บันทึกการตรวจ
                              </span>
                            </div>
                            <span className="text-xs text-gray-600">
                              {formatThaiDate(check.created_at)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap text-gray-700 mb-3">
                            {check.check_note || 'ไม่มีบันทึก'}
                          </p>
                          
                          {/* Toggle button for medications */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchCheckMedications(check.id)}
                            className="w-full justify-between text-blue-700 hover:text-blue-800 hover:bg-blue-100"
                          >
                            <span className="flex items-center gap-2">
                              <Pill className="h-4 w-4" />
                              ดูรายการยาที่จ่าย
                              {checkMedications[check.id] && (
                                <Badge variant="secondary" className="ml-1">
                                  {getMedicationCount(check.id)}
                                </Badge>
                              )}
                            </span>
                            {expandedCheckId === check.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {/* Medications list */}
                        {expandedCheckId === check.id && checkMedications[check.id] && (
                          <div className="border-t border-blue-200 bg-white p-4">
                            {checkMedications[check.id].length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-2">
                                ไม่มียาที่จ่ายในการตรวจนี้
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {checkMedications[check.id].map((med: any, idx: number) => (
                                  <div
                                    key={med.id}
                                    className="flex items-start gap-3 p-2 rounded bg-gray-50 border border-gray-200"
                                  >
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-pharmacy-100 text-pharmacy-700 flex items-center justify-center text-xs font-medium">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900">
                                            {med.medication?.name || 'ไม่ระบุ'}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {med.medication?.code}
                                          </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-sm font-medium text-pharmacy-700">
                                            {med.dosage}
                                          </p>
                                          {med.dispensed && (
                                            <p className="text-xs text-gray-600">
                                              จ่าย: {med.dispensed} {med.medication?.unit}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      {med.instructions && (
                                        <p className="text-xs text-gray-600 mt-1">
                                          📌 {med.instructions}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </TabsContent>
          )}

          {showPharmacyTab && (
            <TabsContent value="dispense">
              {mode === "view" ? (
                <PharmacyDispenseView
                  patientId={patient.id}
                  queueId={queueId}
                />
              ) : medicationsListLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังโหลดข้อมูลยา...
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <EnhancedMedicationDispenseDialog
                  patientId={patient.id}
                  medications={safeMedications}
                  patientMedications={safePatientMedications}
                  loading={medicationsLoading}
                  onDispenseMedication={handleDispenseMedication}
                  onRefreshHistory={handleRefreshHistory}
                />
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PatientInfoDialog;
