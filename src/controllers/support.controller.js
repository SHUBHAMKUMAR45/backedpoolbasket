import SupportTicket from '../models/SupportTicket.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

export const createTicket = asyncHandler(async (req, res) => {
  const { subject, message } = req.body;
  
  const ticket = await SupportTicket.create({
    driverId: req.user._id,
    subject,
    message
  });

  res.status(201).json(new ApiResponse(201, ticket, 'Support ticket submitted successfully. Our team will contact you soon.'));
});

export const getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ driverId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, tickets, 'Tickets fetched successfully'));
});
