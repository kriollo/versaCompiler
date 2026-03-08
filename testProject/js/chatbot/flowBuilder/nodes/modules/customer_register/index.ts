import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import CustomerRegisterEditor from './CustomerRegisterEditor.vue';
import executeCustomerRegister from './customerRegisterLogic';

const customerRegisterModule: NodeModule = {
    type: NodeType.CUSTOMER_REGISTER,
    editor: CustomerRegisterEditor,
    execute: executeCustomerRegister,
};

export default customerRegisterModule;
