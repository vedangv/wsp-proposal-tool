from app.models.user import UserRole
from app.models.proposal import ProposalStatus


def test_user_role_values():
    assert set(UserRole) == {UserRole.pm, UserRole.finance, UserRole.admin}


def test_proposal_status_values():
    assert set(ProposalStatus) == {
        ProposalStatus.draft, ProposalStatus.in_review, ProposalStatus.submitted
    }
