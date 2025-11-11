
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import AppointmentsList from '../AppointmentsList';
import { Appointment } from '@/integrations/supabase/schema';

interface AppointmentTabContentProps {
  value: string;
  appointments: Appointment[];
  getPatientName: (patientId: string) => string;
  emptyMessage: string;
  iconBgColor: string;
  iconColor: string;
  onAppointmentDeleted?: () => void;
}

const AppointmentTabContent: React.FC<AppointmentTabContentProps> = ({
  value,
  appointments,
  getPatientName,
  emptyMessage,
  iconBgColor,
  iconColor,
  onAppointmentDeleted,
}) => {
  return (
    <TabsContent value={value} className="animate-fade-in">
      <AppointmentsList 
        appointments={appointments}
        getPatientName={getPatientName}
        emptyMessage={emptyMessage}
        iconBgColor={iconBgColor}
        iconColor={iconColor}
        onAppointmentDeleted={onAppointmentDeleted}
      />
    </TabsContent>
  );
};

export default AppointmentTabContent;
