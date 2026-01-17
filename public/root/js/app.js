const { createApp, ref, onMounted, computed } = Vue;

createApp({
    setup() {
        // 响应式状态
        const isLoggedIn = ref(false);
        const password = ref('');
        const loginError = ref('');
        const config = ref(null);
        const editorStatus = ref({ message: '', type: '' });
        const currentView = ref('basic'); // 新增状态，用于控制当前显示的配置页面

        // 兑换码管理状态
        const coupons = ref([]);
        const couponStats = ref({});
        const newCoupon = ref({
            type: 'points',
            value: 100,
            maxUses: 1,
            description: '',
            count: 1
        });
        const couponLoading = ref(false);
        const couponError = ref('');

        // 用户积分管理状态
        const usersPoints = ref([]);
        const pointsLoading = ref(false);
        const pointsError = ref('');
        const isEditPointsModalVisible = ref(false);
        const editingUser = ref(null);
        const pointsAction = ref({
            type: 'set',
            value: null,
            reason: ''
        });

        // MCSM 命令开关状态
        const isAfterPurchaseCommandEnabled = ref(false);
        let tempAfterPurchaseCommand = ''; // 用于在禁用时保存命令

        // Docker 镜像管理状态
        const newImage = ref({
            id: '',
            name: '',
            image: '',
            description: ''
        });

        // 密码管理
        const confirmPassword = ref('');


        // 计算属性
        const fullConfig = computed({
            get() {
                if (config.value) {
                    return JSON.stringify(config.value, null, 2);
                }
                return '';
            },
            set(value) {
                try {
                    config.value = JSON.parse(value);
                    showStatus('JSON 格式正确', 'success');
                } catch (e) {
                    showStatus('JSON 格式错误: ' + e.message, 'error');
                }
            }
        });

        // 方法
        const addNewImage = () => {
            if (!newImage.value.id || !newImage.value.name || !newImage.value.image) {
                alert('ID, 名称, 和镜像是必填项。');
                return;
            }
            if (config.value && config.value.docker && config.value.docker.availableImages) {
                // 检查 ID 是否唯一
                if (config.value.docker.availableImages.some(img => img.id === newImage.value.id)) {
                    alert('ID 必须是唯一的。');
                    return;
                }
                config.value.docker.availableImages.push({ ...newImage.value });
                // 重置表单
                newImage.value = { id: '', name: '', image: '', description: '' };
            }
        };

        const deleteImage = (index) => {
            if (confirm(`确定要删除这个镜像吗？`)) {
                if (config.value && config.value.docker && config.value.docker.availableImages) {
                    config.value.docker.availableImages.splice(index, 1);
                }
            }
        };

        const login = async () => {
            if (!password.value) {
                loginError.value = '请输入密码';
                return;
            }
            try {
                const response = await fetch('/api/root/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: password.value })
                });
                const result = await response.json();
                if (result.code === 0) {
                    localStorage.setItem('rootToken', result.data.token);
                    isLoggedIn.value = true;
                    loginError.value = '';
                    loadConfig();
                } else {
                    loginError.value = result.msg || '登录失败';
                }
            } catch (error) {
                loginError.value = '登录请求失败: ' + error.message;
            }
        };

        const logout = () => {
            if (confirm('确定要退出登录吗？')) {
                localStorage.removeItem('rootToken');
                isLoggedIn.value = false;
                password.value = '';
                config.value = null;
            }
        };

        const showStatus = (message, type = 'info') => {
            editorStatus.value = { message, type };
            if (type !== 'error') {
                setTimeout(() => {
                    editorStatus.value = { message: '', type: '' };
                }, 3000);
            }
        };

        const loadConfig = async () => {
            const token = localStorage.getItem('rootToken');
            if (!token) {
                console.log("未找到登录凭证，将显示登录框");
                isLoggedIn.value = false;
                return false;
            }

            try {
                showStatus('正在加载配置...', 'info');

                const sections = [
                    'server', 'services', 'mcsm', 'docker', 'renewal',
                    'customPlan', 'serverPlans', 'checkin', 'cors'
                ];

                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };

                const loadedConfig = {};

                // 1. 先试探性地获取第一个配置节以验证 Token
                const firstSection = sections[0];
                const firstResponse = await fetch(`/api/config/get/${firstSection}`, { headers });

                if (!firstResponse.ok) {
                    const errorData = await firstResponse.json().catch(() => ({ msg: firstResponse.statusText }));
                    // 如果认证失败，直接抛出错误，由 catch 块处理登出逻辑
                    throw new Error(`认证失败或无法加载核心配置: ${errorData.msg}`);
                }

                const firstResult = await firstResponse.json();
                if (firstResult.code === 0) {
                    loadedConfig[firstSection] = firstResult.data;
                } else {
                    throw new Error(`加载配置节 ${firstSection} 失败: ${firstResult.msg}`);
                }

                // 2. 如果第一个成功，再并发获取剩余的配置节
                const remainingSections = sections.slice(1);
                if (remainingSections.length > 0) {
                    const responses = await Promise.all(
                        remainingSections.map(section => fetch(`/api/config/get/${section}`, { headers }))
                    );

                    const results = await Promise.all(responses.map(res => res.ok ? res.json() : Promise.resolve(null)));

                    results.forEach((result, index) => {
                        const sectionName = remainingSections[index];
                        if (result && result.code === 0) {
                            loadedConfig[sectionName] = result.data;
                        } else if (result) {
                            console.error(`加载配置节 ${sectionName} 失败: ${result.msg || '未知错误'}`);
                        } else {
                            console.error(`加载配置节 ${sectionName} 失败: 网络请求错误`);
                        }
                    });
                }


                // --- 保留现有的初始化和清理逻辑 ---
                if (!loadedConfig.services) loadedConfig.services = {};
                if (loadedConfig.mcsm) {
                    if (typeof loadedConfig.mcsm.daemonId === 'undefined') loadedConfig.mcsm.daemonId = '';
                    if (typeof loadedConfig.mcsm.userDataPath === 'undefined') loadedConfig.mcsm.userDataPath = '';
                    if (typeof loadedConfig.mcsm.afterPurchaseCommand === 'undefined') loadedConfig.mcsm.afterPurchaseCommand = '';
                    isAfterPurchaseCommandEnabled.value = !!loadedConfig.mcsm.afterPurchaseCommand;
                    if (isAfterPurchaseCommandEnabled.value) {
                        tempAfterPurchaseCommand = loadedConfig.mcsm.afterPurchaseCommand;
                    }
                }
                if (!loadedConfig.docker) {
                    loadedConfig.docker = { defaultImage: "", availableImages: [] };
                }
                if (!Array.isArray(loadedConfig.docker.availableImages)) {
                    loadedConfig.docker.availableImages = [];
                }
                if (!loadedConfig.services.payment) {
                    loadedConfig.services.payment = { enabled: false, prefix: "/payment", backend: { host: "127.0.0.1", port: 5001, path: "/query_payment" } };
                }

                // 添加一个空的 rootAdmin 对象，用于UI中的密码输入绑定
                loadedConfig.rootAdmin = { password: '' };
                confirmPassword.value = '';

                config.value = loadedConfig;
                showStatus('配置加载成功', 'success');
                return true;

            } catch (error) {
                showStatus('加载配置失败: ' + error.message, 'error');
                // 如果加载失败（例如token失效），则退出登录状态
                localStorage.removeItem('rootToken');
                isLoggedIn.value = false;
                return false;
            }
        };

        const saveConfig = async () => {
            // 密码验证
            if (config.value.rootAdmin && config.value.rootAdmin.password) {
                if (config.value.rootAdmin.password !== confirmPassword.value) {
                    alert('两次输入的密码不一致！');
                    return;
                }
                if (config.value.rootAdmin.password.length < 6) {
                    alert('新密码长度至少需要6位！');
                    return;
                }
            }

            if (!confirm('确定要保存配置吗？\n\n⚠️ 部分配置需要重启服务器才能生效')) {
                return;
            }

            try {
                showStatus('正在保存配置...', 'info');

                const configData = JSON.parse(JSON.stringify(config.value));
                const savePromises = [];

                const token = localStorage.getItem('rootToken');
                if (!token) {
                    throw new Error('未找到登录凭证');
                }

                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };

                // 1. 单独处理密码保存
                if (configData.rootAdmin && configData.rootAdmin.password && configData.rootAdmin.password.length > 0) {
                    savePromises.push(fetch('/api/config/save/rootAdmin', {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({ password: configData.rootAdmin.password })
                    }));
                }

                // 2. 保存所有其他配置节
                for (const section in configData) {
                    if (section !== 'rootAdmin') { // rootAdmin 已单独处理
                        savePromises.push(fetch(`/api/config/save/${section}`, {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify(configData[section])
                        }));
                    }
                }

                const responses = await Promise.all(savePromises);

                // 检查所有保存请求是否成功
                const errorMessages = [];
                for (const res of responses) {
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({ msg: res.statusText }));
                        errorMessages.push(errorData.msg);
                    }
                }

                if (errorMessages.length > 0) {
                    throw new Error('部分配置保存失败: ' + errorMessages.join('; '));
                }

                showStatus('✅ 配置保存成功！部分配置需要重启服务器才能生效', 'success');
                
                // 保存成功后，重新加载配置以确保前端状态与后端同步
                await loadConfig();

            } catch (error) {
                showStatus('保存失败: ' + error.message, 'error');
            }
        };

        // 兑换码管理方法
        const loadCoupons = async () => {
            couponLoading.value = true;
            couponError.value = '';
            try {
                const response = await fetch('/api/coupon/list');
                const result = await response.json();
                if (result.code === 0) {
                    coupons.value = result.data.coupons;
                    couponStats.value = result.data.stats;
                } else {
                    couponError.value = '加载兑换码失败: ' + result.msg;
                }
            } catch (error) {
                couponError.value = '加载兑换码失败: ' + error.message;
            } finally {
                couponLoading.value = false;
            }
        };

        const createCoupon = async () => {
            if (newCoupon.value.value <= 0) {
                alert('面值必须大于0');
                return;
            }
            if (newCoupon.value.count <= 0) {
                alert('数量必须大于0');
                return;
            }

            const api = newCoupon.value.count > 1 ? '/api/coupon/batch' : '/api/coupon/create';
            
            try {
                const response = await fetch(api, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newCoupon.value)
                });
                const result = await response.json();
                if (result.code === 0) {
                    alert('创建成功！');
                    // 重置表单
                    newCoupon.value.value = 100;
                    newCoupon.value.maxUses = 1;
                    newCoupon.value.description = '';
                    newCoupon.value.count = 1;
                    // 重新加载列表
                    loadCoupons();
                } else {
                    alert('创建失败: ' + result.msg);
                }
            } catch (error) {
                alert('创建失败: ' + error.message);
            }
        };

        const deleteCoupon = async (code) => {
            if (!confirm(`确定要删除兑换码 ${code} 吗？此操作不可恢复！`)) {
                return;
            }
            try {
                const response = await fetch('/api/coupon/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const result = await response.json();
                if (result.code === 0) {
                    alert('删除成功！');
                    loadCoupons();
                } else {
                    alert('删除失败: ' + result.msg);
                }
            } catch (error) {
                alert('删除失败: ' + error.message);
            }
        };

        // 用户积分管理方法
        const loadUsersPoints = async () => {
            const token = localStorage.getItem('rootToken');
            if (!token) return;
            pointsLoading.value = true;
            pointsError.value = null;
            try {
                const response = await fetch('/api/users/points', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (result.code === 0 && result.data && Array.isArray(result.data.users)) {
                    usersPoints.value = result.data.users;
                } else if (result.code === 0) {
                    // 兼容旧的/错误的 API 格式，以防万一
                    usersPoints.value = Array.isArray(result.data) ? result.data : [];
                }
                else {
                    throw new Error(result.msg || '获取用户积分失败');
                }
            } catch (error) {
                pointsError.value = error.message;
            } finally {
                pointsLoading.value = false;
            }
        };

        const showEditPointsModal = (user) => {
            editingUser.value = { ...user };
            pointsAction.value = {
                type: 'set',
                value: user.points,
                reason: ''
            };
            isEditPointsModalVisible.value = true;
        };

        const closeEditPointsModal = () => {
            isEditPointsModalVisible.value = false;
            editingUser.value = null;
        };

        const updateUserPoints = async () => {
            if (!editingUser.value || pointsAction.value.value === null || pointsAction.value.value < 0) {
                alert('请输入有效的非负积分值。');
                return;
            }

            const { userId } = editingUser.value;
            const { type, value, reason } = pointsAction.value;
            const token = localStorage.getItem('rootToken');

            let url = '';
            let body = {};

            if (type === 'set') {
                url = '/api/points/set';
                body = { userId, points: value, reason };
            } else {
                url = '/api/points/add';
                const pointsToAdd = type === 'add' ? value : -value;
                body = { userId, points: pointsToAdd, reason };
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(body)
                });
                const result = await response.json();
                if (result.code !== 0) {
                    throw new Error(result.msg || '操作失败');
                }
                
                closeEditPointsModal();
                await loadUsersPoints(); // 刷新列表
                
                showStatus(`用户 ${userId} 的积分已更新。`, 'success');

            } catch (error) {
                alert(`错误: ${error.message}`);
            }
        };


        const toggleAfterPurchaseCommand = () => {
            if (isAfterPurchaseCommandEnabled.value) {
                // 从禁用变为启用，恢复命令
                config.value.mcsm.afterPurchaseCommand = tempAfterPurchaseCommand || '';
            } else {
                // 从启用变为禁用，保存并清空命令
                tempAfterPurchaseCommand = config.value.mcsm.afterPurchaseCommand;
                config.value.mcsm.afterPurchaseCommand = '';
            }
        };

        const handleApiKeyFocus = () => {
            if (config.value && config.value.mcsm && config.value.mcsm.apiKey === '********') {
                config.value.mcsm.apiKey = '';
            }
        };

        const handleApiKeyBlur = () => {
            if (config.value && config.value.mcsm && config.value.mcsm.apiKey === '') {
                config.value.mcsm.apiKey = '********';
            }
        };

        // onMounted 生命周期钩子
        onMounted(async () => {
            const token = localStorage.getItem('rootToken');
            if (token) {
                const success = await loadConfig();
                isLoggedIn.value = success;
            } else {
                isLoggedIn.value = false;
            }
        });

        // 返回模板中需要用到的所有数据和方法
        return {
            isLoggedIn,
            password,
            loginError,
            config,
            editorStatus,
            fullConfig,
            currentView,
            coupons,
            couponStats,
            newCoupon,
            couponLoading,
            couponError,
            login,
            logout,
            loadConfig,
            saveConfig,
            loadCoupons,
            createCoupon,
            deleteCoupon,
            // 用户积分
            usersPoints,
            pointsLoading,
            pointsError,
            isEditPointsModalVisible,
            editingUser,
            pointsAction,
            loadUsersPoints,
            showEditPointsModal,
            closeEditPointsModal,
            updateUserPoints,
            // MCSM 命令
            isAfterPurchaseCommandEnabled,
            toggleAfterPurchaseCommand,
            // Docker
            newImage,
            addNewImage,
            deleteImage,
            // 密码
            confirmPassword,
            // API Key UI
            handleApiKeyFocus,
            handleApiKeyBlur
        };
    }
}).mount('#app');
