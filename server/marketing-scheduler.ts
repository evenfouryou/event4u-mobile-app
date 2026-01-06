import { db } from "./db";
import { 
  siaeTicketedEvents,
  siaeTickets,
  siaeCustomers,
  marketingEmailCampaigns,
  marketingEmailLogs,
  marketingEmailTemplates,
  events,
} from "@shared/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { emailTransporter } from "./email-service";

const REMINDER_SENT_CACHE = new Set<string>();
const FOLLOWUP_SENT_CACHE = new Set<string>();

async function sendEventReminderEmails() {
  try {
    console.log("[MARKETING-SCHEDULER] Checking for events in next 24 hours...");
    
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const upcomingEvents = await db.select({
      ticketedEvent: siaeTicketedEvents,
      event: events,
    })
      .from(siaeTicketedEvents)
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .where(and(
        gte(events.date, now),
        lte(events.date, in24Hours)
      ));
    
    for (const { ticketedEvent, event } of upcomingEvents) {
      const cacheKey = `reminder-${ticketedEvent.id}`;
      if (REMINDER_SENT_CACHE.has(cacheKey)) {
        continue;
      }
      
      const tickets = await db.select({
        ticket: siaeTickets,
        customer: siaeCustomers,
      })
        .from(siaeTickets)
        .innerJoin(siaeCustomers, eq(siaeTickets.customerId, siaeCustomers.id))
        .where(and(
          eq(siaeTickets.ticketedEventId, ticketedEvent.id),
          eq(siaeTickets.status, 'emitted')
        ));
      
      for (const { ticket, customer } of tickets) {
        if (!customer.email) continue;
        
        const emailCacheKey = `reminder-${ticketedEvent.id}-${customer.id}`;
        if (REMINDER_SENT_CACHE.has(emailCacheKey)) continue;
        
        try {
          const eventDate = event.date ? new Date(event.date) : null;
          const formattedDate = eventDate 
            ? eventDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            : 'Data da definire';
          const formattedTime = eventDate
            ? eventDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            : '';
          
          const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0e17; color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-size: 32px; font-weight: bold; color: #FFD700; margin-bottom: 10px;">Event4U</div>
      <div style="font-size: 24px; color: #ffffff;">Il tuo evento sta per iniziare!</div>
    </div>

    <div style="background-color: #151922; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
      <p style="color: #ffffff; margin-top: 0;">Ciao ${customer.firstName || 'Cliente'},</p>
      <p style="color: #94A3B8;">Ti ricordiamo che domani si terrà l'evento:</p>
      
      <div style="background-color: #1e2533; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #FFD700; margin: 0 0 15px 0;">${event.name}</h2>
        <p style="color: #00CED1; margin: 5px 0;">
          <strong>Data:</strong> ${formattedDate}
        </p>
        ${formattedTime ? `<p style="color: #00CED1; margin: 5px 0;"><strong>Ora:</strong> ${formattedTime}</p>` : ''}
      </div>
      
      <p style="color: #94A3B8; font-size: 14px;">Ricordati di portare il tuo biglietto!</p>
    </div>

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1e2533;">
      <p style="color: #94A3B8; font-size: 12px;">&copy; ${new Date().getFullYear()} Event4U - Tutti i diritti riservati</p>
    </div>
  </div>
</body>
</html>
          `;
          
          await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || `"Event4U" <${process.env.SMTP_USER}>`,
            to: customer.email,
            subject: `Promemoria: ${event.name} - Domani!`,
            html: htmlBody,
          });
          
          console.log(`[MARKETING-SCHEDULER] Reminder sent to ${customer.email} for event ${event.name}`);
          REMINDER_SENT_CACHE.add(emailCacheKey);
          
        } catch (emailError) {
          console.error(`[MARKETING-SCHEDULER] Error sending reminder to ${customer.email}:`, emailError);
        }
      }
      
      REMINDER_SENT_CACHE.add(cacheKey);
    }
  } catch (error) {
    console.error("[MARKETING-SCHEDULER] Error in sendEventReminderEmails:", error);
  }
}

async function sendPostEventFollowUpEmails() {
  try {
    console.log("[MARKETING-SCHEDULER] Checking for events ended in last 24 hours...");
    
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = await db.select({
      ticketedEvent: siaeTicketedEvents,
      event: events,
    })
      .from(siaeTicketedEvents)
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .where(and(
        gte(events.date, yesterday),
        lte(events.date, now)
      ));
    
    for (const { ticketedEvent, event } of recentEvents) {
      const cacheKey = `followup-${ticketedEvent.id}`;
      if (FOLLOWUP_SENT_CACHE.has(cacheKey)) {
        continue;
      }
      
      const tickets = await db.select({
        ticket: siaeTickets,
        customer: siaeCustomers,
      })
        .from(siaeTickets)
        .innerJoin(siaeCustomers, eq(siaeTickets.customerId, siaeCustomers.id))
        .where(and(
          eq(siaeTickets.ticketedEventId, ticketedEvent.id),
          eq(siaeTickets.status, 'emitted')
        ));
      
      for (const { ticket, customer } of tickets) {
        if (!customer.email) continue;
        
        const emailCacheKey = `followup-${ticketedEvent.id}-${customer.id}`;
        if (FOLLOWUP_SENT_CACHE.has(emailCacheKey)) continue;
        
        try {
          const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0e17; color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-size: 32px; font-weight: bold; color: #FFD700; margin-bottom: 10px;">Event4U</div>
      <div style="font-size: 24px; color: #ffffff;">Grazie per aver partecipato!</div>
    </div>

    <div style="background-color: #151922; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
      <p style="color: #ffffff; margin-top: 0;">Ciao ${customer.firstName || 'Cliente'},</p>
      <p style="color: #94A3B8;">Grazie per aver partecipato a:</p>
      
      <div style="background-color: #1e2533; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #FFD700; margin: 0 0 15px 0;">${event.name}</h2>
      </div>
      
      <p style="color: #94A3B8;">Speriamo ti sia divertito! Ti aspettiamo ai prossimi eventi.</p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.BASE_URL || 'https://eventfouryou.com'}/acquista" 
           style="display: inline-block; background-color: #FFD700; color: #0a0e17; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Scopri i Prossimi Eventi
        </a>
      </div>
    </div>

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1e2533;">
      <p style="color: #94A3B8; font-size: 12px;">&copy; ${new Date().getFullYear()} Event4U - Tutti i diritti riservati</p>
    </div>
  </div>
</body>
</html>
          `;
          
          await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || `"Event4U" <${process.env.SMTP_USER}>`,
            to: customer.email,
            subject: `Grazie per aver partecipato a ${event.name}!`,
            html: htmlBody,
          });
          
          console.log(`[MARKETING-SCHEDULER] Follow-up sent to ${customer.email} for event ${event.name}`);
          FOLLOWUP_SENT_CACHE.add(emailCacheKey);
          
        } catch (emailError) {
          console.error(`[MARKETING-SCHEDULER] Error sending follow-up to ${customer.email}:`, emailError);
        }
      }
      
      FOLLOWUP_SENT_CACHE.add(cacheKey);
    }
  } catch (error) {
    console.error("[MARKETING-SCHEDULER] Error in sendPostEventFollowUpEmails:", error);
  }
}

async function sendScheduledCampaigns() {
  try {
    console.log("[MARKETING-SCHEDULER] Checking for scheduled campaigns...");
    
    const now = new Date();
    
    const scheduledCampaigns = await db.select()
      .from(marketingEmailCampaigns)
      .where(and(
        eq(marketingEmailCampaigns.status, 'scheduled'),
        lte(marketingEmailCampaigns.scheduledAt, now)
      ));
    
    for (const campaign of scheduledCampaigns) {
      if (!campaign.templateId) continue;
      
      const [template] = await db.select()
        .from(marketingEmailTemplates)
        .where(eq(marketingEmailTemplates.id, campaign.templateId));
      
      if (!template) continue;
      
      console.log(`[MARKETING-SCHEDULER] Sending scheduled campaign: ${campaign.name}`);
      
      let customers: Array<{ id: string; email: string; firstName: string | null }> = [];
      
      if (campaign.eventId) {
        const tickets = await db.select({
          customerId: siaeTickets.customerId,
        })
          .from(siaeTickets)
          .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
          .where(eq(siaeTicketedEvents.eventId, campaign.eventId));
        
        const customerIds = [...new Set(tickets.map(t => t.customerId).filter(Boolean))] as string[];
        
        if (customerIds.length > 0) {
          const customersData = await db.select({
            id: siaeCustomers.id,
            email: siaeCustomers.email,
            firstName: siaeCustomers.firstName,
          })
            .from(siaeCustomers);
          
          customers = customersData.filter(c => c.email && customerIds.includes(c.id));
        }
      } else {
        const customersData = await db.select({
          id: siaeCustomers.id,
          email: siaeCustomers.email,
          firstName: siaeCustomers.firstName,
        })
          .from(siaeCustomers)
          .where(eq(siaeCustomers.companyId, campaign.companyId));
        
        customers = customersData.filter(c => c.email);
      }
      
      let successCount = 0;
      
      for (const customer of customers) {
        try {
          const personalizedHtml = template.htmlContent
            .replace(/\{\{firstName\}\}/g, customer.firstName || 'Cliente')
            .replace(/\{\{email\}\}/g, customer.email);
          
          await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || `"Event4U" <${process.env.SMTP_USER}>`,
            to: customer.email,
            subject: template.subject,
            html: personalizedHtml,
          });
          
          await db.insert(marketingEmailLogs).values({
            campaignId: campaign.id,
            customerId: customer.id,
            email: customer.email,
            status: 'sent',
            sentAt: new Date(),
          });
          
          successCount++;
        } catch (emailError) {
          console.error(`[MARKETING-SCHEDULER] Error sending to ${customer.email}:`, emailError);
          
          await db.insert(marketingEmailLogs).values({
            campaignId: campaign.id,
            customerId: customer.id,
            email: customer.email,
            status: 'failed',
            errorMessage: emailError instanceof Error ? emailError.message : 'Errore sconosciuto',
          });
        }
      }
      
      await db.update(marketingEmailCampaigns)
        .set({
          status: 'sent',
          sentAt: new Date(),
          recipientCount: customers.length,
        })
        .where(eq(marketingEmailCampaigns.id, campaign.id));
      
      console.log(`[MARKETING-SCHEDULER] Campaign ${campaign.name} sent: ${successCount}/${customers.length} emails`);
    }
  } catch (error) {
    console.error("[MARKETING-SCHEDULER] Error in sendScheduledCampaigns:", error);
  }
}

export function startMarketingScheduler() {
  console.log("[MARKETING-SCHEDULER] Starting marketing email scheduler...");
  
  setInterval(() => {
    sendEventReminderEmails();
    sendScheduledCampaigns();
  }, 60 * 60 * 1000);
  
  const now = new Date();
  const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000;
  
  setTimeout(() => {
    sendPostEventFollowUpEmails();
    
    setInterval(() => {
      sendPostEventFollowUpEmails();
    }, 24 * 60 * 60 * 1000);
  }, msUntilNextHour);
  
  setTimeout(() => {
    sendEventReminderEmails();
    sendScheduledCampaigns();
  }, 5000);
  
  console.log("[MARKETING-SCHEDULER] Scheduler started. Running reminder check every hour, follow-up check daily.");
}
