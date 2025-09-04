export const TeamInvitationTemplate = ({
  inviter_name,
  team_name,
  invite_link,
}: {
  inviter_name: string;
  team_name: string;
  invite_link: string;
}) => `
    <h2>You've been invited to join ${team_name}!</h2>
    <p>${inviter_name} has invited you to join the team <strong>${team_name}</strong>.</p>
    <p>
        Click the link below to accept your invitation:<br>
        <a href="${invite_link}">${invite_link}</a>
    </p>
    <p>If you did not expect this invitation, you can safely ignore this email.</p>
`;
